export interface GameFilters {
    categoryIds?: readonly number[];
    publisherId?: number;
}

interface FilterableGame {
    category: { id: number } | null;
    publisher: { id: number } | null;
}

/** Filters games by any selected category and, when provided, one publisher. */
export function filterGames<T extends FilterableGame>(
    games: readonly T[],
    filters: GameFilters,
): T[] {
    const categoryIds = new Set(filters.categoryIds ?? []);

    return games.filter((game) => {
        const matchesCategory =
            categoryIds.size === 0 ||
            (game.category !== null && categoryIds.has(game.category.id));
        const matchesPublisher =
            filters.publisherId === undefined || game.publisher?.id === filters.publisherId;

        return matchesCategory && matchesPublisher;
    });
}
