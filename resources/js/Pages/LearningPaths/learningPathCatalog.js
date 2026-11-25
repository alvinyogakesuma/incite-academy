/**
 * Student learning paths catalog — the page-specific filter logic.
 *
 * The Learning Paths page shares the course catalog's deep-link
 * seed, selection toggle, and field-direction sort comparator
 * (reused from courseCatalog.js, already covered there); this
 * module owns the learning-paths-specific pieces:
 *
 *  - SORT_OPTIONS         the page's sort pairs — title, total
 *                         duration, and course count.
 *  - filterLearningPaths  the search + level pipeline. Null-safe:
 *                         title and description are NOT NULL
 *                         columns in the migration, so the ?? ''
 *                         guards are purely defensive — both fall
 *                         back on values the payload always
 *                         carries (unlike the admin challenges'
 *                         description, which ships nullable).
 *
 * The deep-link seed and the toggle are value-generic: the level
 * is this page's filter axis, so seedCategories(level) and
 * toggleCategory(selection, level) apply unchanged.
 */
export const SORT_OPTIONS = [
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'total_duration-asc', label: 'Duration: Low to High' },
    { value: 'total_duration-desc', label: 'Duration: High to Low' },
    { value: 'courses_count-asc', label: 'Courses: Low to High' },
    { value: 'courses_count-desc', label: 'Courses: High to Low' },
];

/**
 * Search and level filtering over the learning path catalog.
 */
export const filterLearningPaths = (
    learningPaths,
    { searchQuery, selectedLevels },
) => {
    let result = [...learningPaths];

    if (searchQuery) {
        const q = searchQuery.toLowerCase();

        result = result.filter(
            (path) =>
                (path.title ?? '').toLowerCase().includes(q) ||
                (path.description ?? '').toLowerCase().includes(q),
        );
    }

    if (selectedLevels.length > 0) {
        result = result.filter((path) => selectedLevels.includes(path.level));
    }

    return result;
};
