/**
 * Student course catalog pipeline.
 *
 * The Explore Courses page keeps search, category, progress, and
 * sort filtering entirely client-side over the server-provided
 * list of published courses; these helpers own that pipeline so
 * every decision is unit testable:
 *
 *  - seedCategories     a ?category= deep link (the footer's
 *                       columns) seeds the category filter on
 *                       arrival.
 *  - toggleCategory     the sidebar's checkbox-style toggle — an
 *                       already-selected category removes itself.
 *  - filterCourses      search (title, or the optional-chained
 *                       short_description), category selection,
 *                       and the four-way progress filter with its
 *                       zero fallback.
 *  - progressMatches    not_started / in_progress / completed /
 *                       fallthrough, over the progress-or-zero
 *                       value.
 *  - sortCourses        the field-direction comparator — string
 *                       fields compare case-insensitively, the
 *                       direction flips the result.
 *
 * DD note: title is searched unguarded while short_description is
 * optional-chained. Published courses always carry titles (the
 * publish path rides the update validation where title is
 * required), so the asymmetry is unreachable — documented here
 * and pinned by a test rather than fixed.
 */

export const SORT_OPTIONS = [
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'total_duration-asc', label: 'Duration: Low to High' },
    { value: 'total_duration-desc', label: 'Duration: High to Low' },
    { value: 'lessons_count-asc', label: 'Lessons: Low to High' },
    { value: 'lessons_count-desc', label: 'Lessons: High to Low' },
];

/**
 * The category filter's initial selection from a deep link.
 */
export const seedCategories = (categoryParam) =>
    categoryParam ? [categoryParam] : [];

/**
 * Toggle a category in the sidebar's selection.
 */
export const toggleCategory = (prev, category) =>
    prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category];

/**
 * Whether a course's progress satisfies the selected filter —
 * a missing progress counts as not started.
 */
export const progressMatches = (progress, progressFilter) => {
    const value = progress || 0;

    if (progressFilter === 'not_started') return value === 0;
    if (progressFilter === 'in_progress') return value > 0 && value < 100;
    if (progressFilter === 'completed') return value === 100;

    return true;
};

/**
 * Search, category, and progress filtering over the catalog.
 */
export const filterCourses = (
    courses,
    { searchQuery, selectedCategories, progressFilter },
) => {
    let result = [...courses];

    if (searchQuery) {
        const q = searchQuery.toLowerCase();

        result = result.filter(
            (course) =>
                course.title.toLowerCase().includes(q) ||
                course.short_description?.toLowerCase().includes(q),
        );
    }

    if (selectedCategories.length > 0) {
        result = result.filter((course) =>
            selectedCategories.includes(course.category),
        );
    }

    if (progressFilter !== 'all') {
        result = result.filter((course) =>
            progressMatches(course.progress, progressFilter),
        );
    }

    return result;
};

/**
 * Sort by a field-direction value ('title-asc',
 * 'total_duration-desc', ...) — string fields compare without
 * regard to case, the direction flips the comparison.
 */
export const sortCourses = (courses, sortBy) => {
    const [field, direction] = sortBy.split('-');

    return [...courses].sort((a, b) => {
        let valueA = a[field];
        let valueB = b[field];

        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;

        return 0;
    });
};
