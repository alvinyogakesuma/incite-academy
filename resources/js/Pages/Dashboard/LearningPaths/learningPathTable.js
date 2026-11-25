/**
 * Learning paths management table pipeline — the page-specific
 * filter, sort options, level theme, and the delete flow's
 * decisions. Everything else reuses the covered `courseTable.js`
 * helpers (sortCourses with custom options, paginateCourses,
 * categoryThemeFor with a custom fallback key, hasDeletableId,
 * formatDuration, PAGE_SIZE_OPTIONS):
 *
 *  - SORT_OPTIONS / DEFAULT_SORT  this page's sort pairs — title,
 *                                 total duration, and course count
 *                                 (the comparator lives in
 *                                 courseTable, generalized to
 *                                 accept them).
 *  - LEVEL_CONFIGS                the card's icon and gradient per
 *                                 level, shaped as a theme map so
 *                                 categoryThemeFor applies — the
 *                                 page passes 'All Levels' as the
 *                                 custom fallback key (the map's
 *                                 last entry, not its first, so
 *                                 the courses' default key would
 *                                 miss).
 *  - filterLearningPaths          search + level. Null-safe:
 *                                 title and description are NOT
 *                                 NULL columns in the migration,
 *                                 so the ?? '' guards are purely
 *                                 defensive — both fall back on
 *                                 values the payload always
 *                                 carries.
 *  - shouldShowReset              the page's own 3-way "filters
 *                                 are dirty" check, self-contained
 *                                 rather than silently coupled to
 *                                 the courses default label.
 *  - levelBadgeText               the card's badge copy — a null
 *                                 or empty level falls back to
 *                                 'All Levels' (defensive: the
 *                                 column is a NOT NULL enum).
 *  - learningPathDeleteUrl        the delete flow's guard-composed
 *                                 URL: a deletable pending path
 *                                 resolves to the destroy route,
 *                                 anything else (null, an id-less
 *                                 row) to null — the
 *                                 early-return arm.
 *  - learningPathDeleteDescription  the delete dialog's copy keyed
 *                                 to the pending path's title,
 *                                 null-safe on the object (the
 *                                 closed-state string is computed
 *                                 every render but the Radix
 *                                 portal is unmounted, so it is
 *                                 never displayed).
 */
import { Flame, GraduationCap, TrendingUp, Feather } from 'lucide-react';
import { hasDeletableId } from '@/Pages/Dashboard/Courses/courseTable';

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
    { label: 'Courses: Low to High', field: 'courses_count', direction: 'asc' },
    {
        label: 'Courses: High to Low',
        field: 'courses_count',
        direction: 'desc',
    },
];

export const DEFAULT_SORT = SORT_OPTIONS[0];

// The level's visual identity — the deprecated page's gradient
// and icon per level, kept verbatim.
export const LEVEL_CONFIGS = {
    Beginner: {
        icon: Feather,
        gradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
    },
    Intermediate: {
        icon: TrendingUp,
        gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    },
    Advanced: {
        icon: Flame,
        gradient: 'linear-gradient(135deg, #f43f5e 0%, #dc2626 100%)',
    },
    'All Levels': {
        icon: GraduationCap,
        gradient: 'linear-gradient(135deg, #2563eb 0%, #f43f5e 100%)',
    },
};

/**
 * Search and level filtering over the learning path listing.
 */
export const filterLearningPaths = (learningPaths, { query, levelFilter }) => {
    const search = query.toLowerCase();

    return learningPaths.filter((path) => {
        // Search match (null-safe: both columns are NOT NULL —
        // the guards are purely defensive)
        const matchesSearch =
            query === '' ||
            (path.title ?? '').toLowerCase().includes(search) ||
            (path.description ?? '').toLowerCase().includes(search);

        // Level match
        const matchesLevel =
            levelFilter === 'All' || path.level === levelFilter;

        return matchesSearch && matchesLevel;
    });
};

/**
 * Whether the reset button shows — the 3-way "filters are dirty"
 * check against this page's defaults.
 */
export const shouldShowReset = ({ searchQuery, levelFilter, sortLabel }) =>
    Boolean(
        searchQuery ||
        levelFilter !== 'All' ||
        sortLabel !== DEFAULT_SORT.label,
    );

/**
 * The card's badge copy — a null or empty level falls back to
 * 'All Levels'.
 */
export const levelBadgeText = (level) => level || 'All Levels';

/**
 * The delete flow's guard-composed URL — a deletable pending path
 * resolves to the destroy route (DELETE
 * /dashboard/learning-paths/{learning_path}); anything else (null,
 * an id-less row) resolves to null, which the page treats as the
 * early-return arm.
 */
export const learningPathDeleteUrl = (path) =>
    hasDeletableId(path) ? `/dashboard/learning-paths/${path.id}` : null;

/**
 * The delete dialog's copy — keyed to the pending path's title,
 * null-safe on the object itself.
 */
export const learningPathDeleteDescription = (path) =>
    `Are you sure you want to delete ${path?.title}? This will permanently remove this learning path and its course sequence.`;
