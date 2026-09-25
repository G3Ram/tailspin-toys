import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('should filter games by category and clear the filter', async ({ page }) => {
    await page.goto('/');

    const categoryFilter = page.getByTestId('category-filter').first();
    const categoryId = await categoryFilter.getAttribute('value');
    if (categoryId === null) throw new Error('Expected a category filter option');

    const totalGames = await page.getByTestId('game-card').count();
    const matchingGames = await page
      .locator(`[data-testid="game-card"][data-game-category-id="${categoryId}"]`)
      .count();

    await test.step('Use the category filter with the keyboard', async () => {
      await categoryFilter.focus();
      await page.keyboard.press('Space');
      await expect(categoryFilter).toBeChecked();
      await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(matchingGames);
      await expect(page.getByTestId('filter-results-status')).toHaveText(
        `Showing ${matchingGames} of ${totalGames} games.`,
      );
    });

    await test.step('Clear the selected category', async () => {
      await page.getByTestId('clear-filters').click();
      await expect(categoryFilter).not.toBeChecked();
      await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(totalGames);
    });
  });

  test('should filter games by publisher', async ({ page }) => {
    await page.goto('/');

    const publisherSelect = page.getByTestId('publisher-filter');
    const firstPublisher = publisherSelect.locator('option').nth(1);
    const publisherId = await firstPublisher.getAttribute('value');
    if (publisherId === null) throw new Error('Expected a publisher filter option');

    const matchingGames = await page
      .locator(`[data-testid="game-card"][data-game-publisher-id="${publisherId}"]`)
      .count();

    await publisherSelect.selectOption(publisherId);

    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(matchingGames);
    await expect(page.getByTestId('filter-results-status')).toHaveText(
      `Showing ${matchingGames} of ${await page.getByTestId('game-card').count()} games.`,
    );
  });

  test('should combine category and publisher filters', async ({ page }) => {
    await page.goto('/');

    const firstGame = page.getByTestId('game-card').first();
    const categoryId = await firstGame.getAttribute('data-game-category-id');
    const publisherId = await firstGame.getAttribute('data-game-publisher-id');
    if (categoryId === null || publisherId === null) {
      throw new Error('Expected the first game to have a category and publisher');
    }

    const categoryFilter = page.locator(
      `[data-testid="category-filter"][value="${categoryId}"]`,
    );
    const publisherSelect = page.getByTestId('publisher-filter');
    const matchingGames = await page
      .locator(
        `[data-testid="game-card"][data-game-category-id="${categoryId}"][data-game-publisher-id="${publisherId}"]`,
      )
      .count();

    await categoryFilter.check();
    await publisherSelect.selectOption(publisherId);

    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(matchingGames);
  });

  test('should show a no-matches message when filters have no results', async ({ page }) => {
    await page.goto('/');

    const publisherSelect = page.getByTestId('publisher-filter');
    await publisherSelect.evaluate((select) => {
      if (!(select instanceof HTMLSelectElement)) {
        throw new Error('Expected a publisher select control');
      }

      const unavailablePublisher = document.createElement('option');
      unavailablePublisher.value = '99999';
      unavailablePublisher.textContent = 'Publisher without games';
      select.append(unavailablePublisher);
      select.value = unavailablePublisher.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.getByTestId('no-matching-games')).toHaveText(
      'No games match the selected filters.',
    );
    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(0);
  });

  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should display each game rating out of five on its card', async ({ page }) => {
    await page.goto('/');

    const gameCards = page.getByTestId('game-card');
    await expect(gameCards.first()).toBeVisible();

    for (let index = 0; index < await gameCards.count(); index += 1) {
      const rating = gameCards.nth(index).getByTestId('game-rating');
      await expect(rating).toBeVisible();
      await expect(rating).toHaveText(/(?:\d+\.\d+\s*\/\s*5|No rating yet)/);
    }
  });

  test('should show a numeric rating out of five on a rated game card', async ({ page }) => {
    await page.goto('/');

    const ratedGameCard = page.locator('[data-testid="game-card"][data-game-title="Pipeline Conquest"]');
    await expect(ratedGameCard.getByTestId('game-rating')).toHaveText(/^\s*★.*\d+\.\d+\s*\/\s*5\s*$/);
  });

  test('should show the no-rating state on the unrated game card', async ({ page }) => {
    await page.goto('/');

    const unratedGameCard = page.locator('[data-testid="game-card"][data-game-title="DevOps Dominion"]');
    await expect(unratedGameCard.getByTestId('game-rating')).toHaveText('No rating yet');
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent game', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
      await expect(page.getByTestId('not-found-heading')).not.toBeEmpty();
      await expect(page.getByTestId('not-found-home-link')).toBeVisible();
    });
  });
});
