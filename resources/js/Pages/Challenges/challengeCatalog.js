/**
 * Student challenges catalog — the page-specific filter logic.
 *
 * The Explore Challenges page shares the course catalog's
 * deep-link seed, category toggle, and field-direction sort
 * comparator (reused from courseCatalog.js, already covered there);
 * this module owns the challenges-specific piece:
 *
 *  - SORT_OPTIONS     the page's sort pairs — title, duration, and
 *                     points.
 *  - filterChallenges the search + category pipeline. Null-safe:
 *                     title and description are nullable columns
 *                     (the ?? '' guards are defensive — the admin's
 *                     draft rows are seeded 'Untitled Challenge'),
 *                     and challenges carry no progress filter, the
 *                     structural difference from the course
 *                     catalog's pipeline.
 */
export const SORT_OPTIONS = [
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'duration-asc', label: 'Duration: Low to High' },
    { value: 'duration-desc', label: 'Duration: High to Low' },
    { value: 'points-asc', label: 'Points: Low to High' },
    { value: 'points-desc', label: 'Points: High to Low' },
];

/**
 * Search and category filtering over the challenge catalog.
 */
export const filterChallenges = (
    challenges,
    { searchQuery, selectedCategories },
) => {
    let result = [...challenges];

    if (searchQuery) {
        const q = searchQuery.toLowerCase();

        result = result.filter(
            (challenge) =>
                (challenge.title ?? '').toLowerCase().includes(q) ||
                (challenge.description ?? '').toLowerCase().includes(q),
        );
    }

    if (selectedCategories.length > 0) {
        result = result.filter((challenge) =>
            selectedCategories.includes(challenge.category),
        );
    }

    return result;
};
