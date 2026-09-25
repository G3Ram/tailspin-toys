import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
} from './games';

interface FilterFixture {
    strategyId: number;
    puzzleId: number;
    publisherOneId: number;
    publisherTwoId: number;
}

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterGames(db: Database): Promise<FilterFixture> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'strategy games' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'puzzle games' })
        .returning({ id: categories.id });
    const [publisherOne] = await db
        .insert(publishers)
        .values({ name: 'Publisher One', description: 'first publisher' })
        .returning({ id: publishers.id });
    const [publisherTwo] = await db
        .insert(publishers)
        .values({ name: 'Publisher Two', description: 'second publisher' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Alpha Strategy',
            description: 'Strategy game from publisher one',
            categoryId: strategy.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Beta Puzzle',
            description: 'Puzzle game from publisher one',
            categoryId: puzzle.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Gamma Strategy',
            description: 'Strategy game from publisher two',
            categoryId: strategy.id,
            publisherId: publisherTwo.id,
        },
    ]);

    return {
        strategyId: strategy.id,
        puzzleId: puzzle.id,
        publisherOneId: publisherOne.id,
        publisherTwoId: publisherTwo.id,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('filters games by one or more categories', async () => {
        const { strategyId, puzzleId } = await seedFilterGames(db);

        const filtered = await getAllGames(db, { categoryIds: [strategyId, puzzleId] });

        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Strategy',
            'Beta Puzzle',
            'Gamma Strategy',
        ]);
    });

    it('filters games by publisher', async () => {
        const { publisherOneId } = await seedFilterGames(db);

        const filtered = await getAllGames(db, { publisherId: publisherOneId });

        expect(filtered.map((game) => game.title)).toEqual(['Alpha Strategy', 'Beta Puzzle']);
    });

    it('combines category and publisher filters', async () => {
        const { strategyId, publisherTwoId } = await seedFilterGames(db);

        const filtered = await getAllGames(db, {
            categoryIds: [strategyId],
            publisherId: publisherTwoId,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Gamma Strategy']);
    });

    it('returns no games when the filters do not match', async () => {
        const { puzzleId, publisherTwoId } = await seedFilterGames(db);

        const filtered = await getAllGames(db, {
            categoryIds: [puzzleId],
            publisherId: publisherTwoId,
        });

        expect(filtered).toEqual([]);
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
