/**
 * Challenges management table pipeline — the page-specific
 * filter and sort options plus the delete flow's decisions.
 * Everything else reuses the covered `courseTable.js` helpers
 * (paginateCourses, categoryThemeFor, categoryBadgeFor,
 * hasDeletableId, formatDuration):
 *
 *  - SORT_OPTIONS / DEFAULT_SORT  this page's sort pairs — title,
 *                                 duration, and points (the
 *                                 comparator lives in courseTable,
 *                                 generalized to accept them).
 *  - CHALLENGE_CATEGORY_GRADIENTS the card gradient per category,
 *                                 shaped as a theme map so
 *                                 categoryThemeFor's fallback
 *                                 applies (a null category falls
 *                                 back to the Reading
 *                                 Comprehension theme).
 *  - filterChallenges             search + category. Null-safe:
 *                                 title and description are
 *                                 nullable columns (the ?? ''
 *                                 guards are defensive here —
 *                                 the admin's draft rows are
 *                                 seeded 'Untitled Challenge', but
 *                                 description ships nullable).
 *  - shouldShowReset              the page's own 3-way "filters
 *                                 are dirty" check, self-contained
 *                                 rather than silently coupled to
 *                                 the courses default label.
 *  - challengeDeleteUrl           the delete flow's guard-composed
 *                                 URL: a deletable pending
 *                                 challenge resolves to the
 *                                 destroy route, anything else
 *                                 (null, an id-less draft) to
 *                                 null — the early-return arm.
 *  - challengeDeleteDescription   the delete dialog's copy keyed
 *                                 to the pending challenge's
 *                                 title, null-safe on the object
 *                                 (the closed-state string is
 *                                 computed every render but the
 *                                 Radix portal is unmounted, so
 *                                 it is never displayed).
 */
import { hasDeletableId } from '@/Pages/Dashboard/Courses/courseTable';

export const SORT_OPTIONS = [
    { label: 'Title: A - Z', field: 'title', direction: 'asc' },
    { label: 'Title: Z - A', field: 'title', direction: 'desc' },
    { label: 'Duration: Low to High', field: 'duration', direction: 'asc' },
    { label: 'Duration: High to Low', field: 'duration', direction: 'desc' },
    { label: 'Points: Low to High', field: 'points', direction: 'asc' },
    { label: 'Points: High to Low', field: 'points', direction: 'desc' },
];

export const DEFAULT_SORT = SORT_OPTIONS[0];

export const CHALLENGE_CATEGORY_GRADIENTS = {
    'Reading Comprehension': {
        gradient:
            'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
    },
    'Listening Comprehension': {
        gradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
    },
    'Structure and Writing Expression': {
        gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
    },
};

/**
 * Search and category filtering over the challenge catalog.
 */
export const filterChallenges = (challenges, { query, categoryFilter }) => {
    const search = query.toLowerCase();

    return challenges.filter((challenge) => {
        // Search match (null-safe: description ships nullable)
        const matchesSearch =
            query === '' ||
            (challenge.title ?? '').toLowerCase().includes(search) ||
            (challenge.description ?? '').toLowerCase().includes(search);

        // Category match
        const matchesCategory =
            categoryFilter === 'All' || challenge.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });
};

/**
 * Whether the reset button shows — the 3-way "filters are dirty"
 * check against this page's defaults.
 */
export const shouldShowReset = ({ searchQuery, categoryFilter, sortLabel }) =>
    Boolean(
        searchQuery ||
        categoryFilter !== 'All' ||
        sortLabel !== DEFAULT_SORT.label,
    );

/**
 * The delete flow's guard-composed URL — a deletable pending
 * challenge resolves to the destroy route (DELETE
 * /dashboard/challenges/{challenge}); anything else (null, an
 * id-less draft) resolves to null, which the page treats as the
 * early-return arm.
 */
export const challengeDeleteUrl = (challenge) =>
    hasDeletableId(challenge) ? `/dashboard/challenges/${challenge.id}` : null;

/**
 * The delete dialog's copy — keyed to the pending challenge's
 * title, null-safe on the object itself.
 */
export const challengeDeleteDescription = (challenge) =>
    `Are you sure you want to delete ${challenge?.title}? This action will permanently remove this challenge from the directory.`;
