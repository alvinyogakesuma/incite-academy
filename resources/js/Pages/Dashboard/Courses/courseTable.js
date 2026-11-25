/**
 * Courses management table pipeline.
 *
 * The page keeps search, filtering, sorting, and pagination entirely
 * client-side; these helpers own that pipeline so every decision is
 * unit testable:
 *
 *  - filterCourses     matches search + category. Null-safe: blank
 *                      draft rows (created server-side with no
 *                      attributes) carry null title, null
 *                      short_description, and null category, so the
 *                      search must not call toLowerCase() on null.
 *  - sortCourses       label lookup with a default fallback, lodash
 *                      orderBy with a case-insensitive iteratee for
 *                      string fields, numeric passthrough otherwise.
 *  - paginateCourses   slice window + totalPages floored at 1 + a
 *                      live safePage clamp, which settles the page on
 *                      every render instead of only after a delete.
 *  - shouldShowReset   3-way "filters are dirty" check.
 *  - formatDuration    hours/minutes copy with an hours > 0 ternary.
 *  - categoryThemeFor  theme lookup with a default-category fallback
 *                      for null/unknown categories (draft rows).
 *  - categoryBadgeFor  badge text with an 'Uncategorized' fallback.
 *  - hasDeletableId    delete-dialog guard covering both ?.
 *                      arms (null course / missing id).
 */
import orderBy from 'lodash/orderBy';

export const PAGE_SIZE_OPTIONS = [4, 8, 12];

export const SORT_OPTIONS = [
    { label: 'Title: A - Z', field: 'title', direction: 'asc' },
    { label: 'Title: Z - A', field: 'title', direction: 'desc' },
    {
        label: 'Duration: Low to High',
        field: 'total_duration',
        direction: 'asc',
    },
    {
        label: 'Duration: High to Low',
        field: 'total_duration',
        direction: 'desc',
    },
    { label: 'Modules: Low to High', field: 'modules_count', direction: 'asc' },
    {
        label: 'Modules: High to Low',
        field: 'modules_count',
        direction: 'desc',
    },
];

export const DEFAULT_SORT = SORT_OPTIONS[0];

export const DEFAULT_CATEGORY = 'Reading Comprehension';

export const filterCourses = (courses, { query, categoryFilter }) => {
    const search = query.toLowerCase();

    return courses.filter((course) => {
        // Search match (null-safe: draft rows carry null fields)
        const matchesSearch =
            search === '' ||
            (course.title ?? '').toLowerCase().includes(search) ||
            (course.short_description ?? '').toLowerCase().includes(search);

        // Category match
        const matchesCategory =
            categoryFilter === 'All' || course.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });
};

/**
 * Sort the courses by a label from the given options — unknown
 * labels fall back to the first option, so a stale sort value
 * never crashes the resolver.
 *
 * Generalized so sibling management pages (the challenges index)
 * can reuse the comparator with their own label set while the
 * courses page keeps its default.
 *
 * @param {Array} courses
 * @param {string} sortLabel
 * @param {Array<{label: string, field: string, direction: string}>} [sortOptions] defaults to the courses' options.
 */
export const sortCourses = (courses, sortLabel, sortOptions = SORT_OPTIONS) => {
    const sort =
        sortOptions.find((option) => option.label === sortLabel) ??
        sortOptions[0];

    return orderBy(
        courses,
        [
            (course) =>
                typeof course[sort.field] === 'string'
                    ? course[sort.field].toLowerCase()
                    : course[sort.field],
        ],
        [sort.direction],
    );
};

export const paginateCourses = (courses, currentPage, pageSize) => {
    const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;

    return {
        items: courses.slice(start, start + pageSize),
        totalPages,
        safePage,
    };
};

export const shouldShowReset = ({ searchQuery, categoryFilter, sortLabel }) =>
    Boolean(
        searchQuery ||
        categoryFilter !== 'All' ||
        sortLabel !== DEFAULT_SORT.label,
    );

export const formatDuration = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/**
 * The theme lookup — the entry for the category, or the map's
 * fallback entry. The `fallbackKey` names the fallback: the
 * courses' first category by default, generalized so the learning
 * paths' theme can fall back to its own key ('All Levels', the
 * map's last entry, not its first).
 */
export const categoryThemeFor = (
    category,
    categoryMap,
    fallbackKey = DEFAULT_CATEGORY,
) => categoryMap[category] ?? categoryMap[fallbackKey];

export const categoryBadgeFor = (category) => category || 'Uncategorized';

export const hasDeletableId = (course) => Boolean(course?.id);
