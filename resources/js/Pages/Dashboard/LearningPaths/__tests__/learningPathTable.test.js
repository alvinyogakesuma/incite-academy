/**
 * Learning paths management table tests.
 *
 * Covers the page-specific decisions in learningPathTable.js —
 * the filter, the reset check, the level theme/badge, and the
 * delete flow — and pins the courseTable helper reuse on this
 * page's payload:
 *
 *  filterLearningPaths
 *   D1  search guard              (empty query → all / query → filter)
 *   D2  searchable fields         (title / description / no match)
 *   D3  null-safe fields          (both ?? '' arms — defensive-only:
 *                                 the migration ships title and
 *                                 description NOT NULL)
 *   D4  level filter              (All / match / mismatch)
 *   D5  AND composition           (search + level)
 *
 *  shouldShowReset
 *   D6  each of the three conditions triggers (3 cases)
 *   D7  all defaults → false
 *
 *  Reuse pins (courseTable helpers on this page's payload)
 *   D8  sortCourses — the page's own labels sort (title
 *       case-insensitive both ways; duration and course count
 *       numerically); an unknown label → the first option
 *   D9  paginateCourses — the live clamp on this page's data
 *   D10 categoryThemeFor — a custom fallback key: a null or
 *       unknown level falls back to the 'All Levels' config
 *   D11 formatDuration — the ninth duplicate eliminated
 *
 *  The page's level helpers
 *   D12 levelBadgeText — a present level is its own copy; a null
 *       or empty level falls back (defensive-only: a NOT NULL
 *       enum column)
 *
 *  The delete flow (learningPathTable helpers)
 *   D13 the guard-composed URL — a deletable pending path
 *       resolves to the destroy route; null and id-less rows
 *       resolve to no URL (the early-return arm)
 *   D14 the dialog copy — titled arm and the null closed-state
 *       arm (computed every render, never displayed while the
 *       Radix portal is unmounted)
 *   D15 the post-delete pagination — the live clamp in
 *       paginateCourses handles the shrunken list (no
 *       pageAfterDelete helper needed)
 */
import { describe, it, expect } from 'vitest';
import {
    DEFAULT_SORT,
    LEVEL_CONFIGS,
    SORT_OPTIONS,
    filterLearningPaths,
    learningPathDeleteDescription,
    learningPathDeleteUrl,
    levelBadgeText,
    shouldShowReset,
} from '../learningPathTable';
import {
    categoryThemeFor,
    formatDuration,
    paginateCourses,
    sortCourses,
} from '@/Pages/Dashboard/Courses/courseTable';

/** Mirrors the Admin LearningPathController::index map shape. */
const LEARNING_PATHS = [
    {
        id: 1,
        title: 'TOEFL Foundation Path',
        description: 'Build the basics from scratch',
        level: 'Beginner',
        image_url: '/storage/learning-paths/beginner.png',
        courses_count: 5,
        total_duration: 480,
    },
    {
        id: 2,
        title: 'Advanced Mastery Journey',
        description: 'Polish every skill for the exam',
        level: 'Advanced',
        image_url: null,
        courses_count: 8,
        total_duration: 720,
    },
    {
        id: 3,
        title: 'Listening Immersion Track',
        description: 'Ear training first',
        level: 'Intermediate',
        image_url: null,
        courses_count: 4,
        total_duration: 360,
    },
];

const NO_FILTERS = { query: '', levelFilter: 'All' };

describe('filterLearningPaths', () => {
    it('D1 — an empty query returns every path', () => {
        expect(filterLearningPaths(LEARNING_PATHS, NO_FILTERS)).toHaveLength(3);
    });

    it('D2 — matches on title', () => {
        const result = filterLearningPaths(LEARNING_PATHS, {
            ...NO_FILTERS,
            query: 'foundation',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('D2 — matches on description', () => {
        const result = filterLearningPaths(LEARNING_PATHS, {
            ...NO_FILTERS,
            query: 'ear training',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('D2 — drops paths that match no field', () => {
        expect(
            filterLearningPaths(LEARNING_PATHS, {
                ...NO_FILTERS,
                query: 'zzz',
            }),
        ).toHaveLength(0);
    });

    it('D3 — a null description is reached safely when the title misses', () => {
        const withNullDesc = [
            ...LEARNING_PATHS,
            {
                id: 4,
                title: 'Mock Journey',
                description: null,
                level: 'Beginner',
                image_url: null,
                courses_count: 2,
                total_duration: 120,
            },
        ];

        // Title misses, so the || chain falls through to the null
        // description — the guard keeps the search crash-free.
        expect(
            filterLearningPaths(withNullDesc, {
                ...NO_FILTERS,
                query: 'zzz',
            }),
        ).toHaveLength(0);

        // The title still matches with the description null.
        expect(
            filterLearningPaths(withNullDesc, {
                ...NO_FILTERS,
                query: 'mock',
            }),
        ).toHaveLength(1);
    });

    it('D3 — a null title is reached safely when the description matches', () => {
        // Mirror arm: the title null-guard's fallback is reached
        // only when a description exists and the title misses it.
        const withNullTitle = [
            {
                id: 5,
                title: null,
                description: 'A draft journey description',
                level: 'Beginner',
                image_url: null,
                courses_count: 2,
                total_duration: 120,
            },
        ];

        expect(
            filterLearningPaths(withNullTitle, {
                ...NO_FILTERS,
                query: 'draft',
            }),
        ).toHaveLength(1);

        expect(
            filterLearningPaths(withNullTitle, {
                ...NO_FILTERS,
                query: 'zzz',
            }),
        ).toHaveLength(0);
    });

    it('D4 — the level filter matches the exact level', () => {
        const result = filterLearningPaths(LEARNING_PATHS, {
            ...NO_FILTERS,
            levelFilter: 'Advanced',
        });

        expect(result.map((path) => path.id)).toEqual([2]);
    });

    it('D4 — the level filter drops non-matching levels', () => {
        expect(
            filterLearningPaths(LEARNING_PATHS, {
                ...NO_FILTERS,
                levelFilter: 'Beginner',
            }),
        ).toHaveLength(1);
    });

    it('D5 — search and level compose with AND', () => {
        expect(
            filterLearningPaths(LEARNING_PATHS, {
                query: 'journey',
                levelFilter: 'Advanced',
            }),
        ).toHaveLength(1);

        expect(
            filterLearningPaths(LEARNING_PATHS, {
                query: 'journey',
                levelFilter: 'Beginner',
            }),
        ).toHaveLength(0);
    });
});

describe('shouldShowReset', () => {
    const DEFAULTS = {
        searchQuery: '',
        levelFilter: 'All',
        sortLabel: DEFAULT_SORT.label,
    };

    it('D6 — a dirty search query shows the reset button', () => {
        expect(
            shouldShowReset({ ...DEFAULTS, searchQuery: 'foundation' }),
        ).toBe(true);
    });

    it('D6 — a level filter shows the reset button', () => {
        expect(shouldShowReset({ ...DEFAULTS, levelFilter: 'Advanced' })).toBe(
            true,
        );
    });

    it('D6 — a non-default sort shows the reset button', () => {
        expect(
            shouldShowReset({
                ...DEFAULTS,
                sortLabel: 'Courses: High to Low',
            }),
        ).toBe(true);
    });

    it('D7 — all defaults hide the reset button', () => {
        expect(shouldShowReset(DEFAULTS)).toBe(false);
    });
});

describe('courseTable helper reuse — this page’s payload', () => {
    it('D8 — the page\u2019s labels sort, numerically and case-insensitively', () => {
        expect(
            sortCourses(LEARNING_PATHS, 'Title: A - Z', SORT_OPTIONS).map(
                (path) => path.id,
            ),
        ).toEqual([2, 3, 1]);
        expect(
            sortCourses(
                LEARNING_PATHS,
                'Duration: Low to High',
                SORT_OPTIONS,
            ).map((path) => path.id),
        ).toEqual([3, 1, 2]);
        expect(
            sortCourses(
                LEARNING_PATHS,
                'Courses: High to Low',
                SORT_OPTIONS,
            ).map((path) => path.id),
        ).toEqual([2, 1, 3]);
    });

    it('D8 — an unknown label falls back to the first option', () => {
        expect(
            sortCourses(
                [...LEARNING_PATHS].reverse(),
                'bogus',
                SORT_OPTIONS,
            ).map((path) => path.id),
        ).toEqual([2, 3, 1]);
    });

    it('D9 — paginateCourses clamps the page live on the path list', () => {
        const { items, totalPages, safePage } = paginateCourses(
            LEARNING_PATHS,
            9,
            2,
        );

        expect(safePage).toBe(2);
        expect(items.map((path) => path.id)).toEqual([3]);
        expect(totalPages).toBe(2);
    });

    it('D10 — a null or unknown level falls back to the All Levels config', () => {
        // The page passes 'All Levels' as the custom fallback key —
        // the map's last entry, not its first.
        expect(
            categoryThemeFor('Quantum Level', LEVEL_CONFIGS, 'All Levels'),
        ).toEqual(LEVEL_CONFIGS['All Levels']);
        expect(categoryThemeFor(null, LEVEL_CONFIGS, 'All Levels')).toEqual(
            LEVEL_CONFIGS['All Levels'],
        );
        expect(
            categoryThemeFor('Beginner', LEVEL_CONFIGS, 'All Levels'),
        ).toEqual(LEVEL_CONFIGS.Beginner);
    });

    it('D11 — durations render in hours and minutes', () => {
        expect(formatDuration(15)).toBe('15m');
        expect(formatDuration(480)).toBe('8h 0m');
    });
});

describe('the page\u2019s level helpers', () => {
    it('D12 — a present level is its own badge copy', () => {
        expect(levelBadgeText('Beginner')).toBe('Beginner');
    });

    it('D12 — a null or empty level falls back to All Levels', () => {
        // Defensive-only: the column is a NOT NULL enum.
        expect(levelBadgeText(null)).toBe('All Levels');
        expect(levelBadgeText('')).toBe('All Levels');
    });
});

describe('the delete flow — learningPathTable helpers', () => {
    it('D13 — a deletable pending path resolves the destroy route URL', () => {
        // The route contract: dashboard.learning-paths.destroy
        // (DELETE /dashboard/learning-paths/{learning_path}).
        expect(learningPathDeleteUrl({ id: 9, title: 'Foundation Path' })).toBe(
            '/dashboard/learning-paths/9',
        );
    });

    it('D13 — a null pending path resolves to no URL', () => {
        // The dialog only opens via startDelete with a full row,
        // so the guard's false arm is defensive — pinned as the
        // current contract rather than fixed (the unreachable
        // branch stays covered).
        expect(learningPathDeleteUrl(null)).toBeNull();
    });

    it('D13 — an id-less row resolves to no URL', () => {
        // hasDeletableId's false arm: a row without an id (the
        // family the guard exists for) can never fire a request.
        expect(learningPathDeleteUrl({ title: 'Draft' })).toBeNull();
    });

    it('D14 — the dialog copy names the path and the consequence', () => {
        expect(
            learningPathDeleteDescription({ title: 'Foundation Path' }),
        ).toBe(
            'Are you sure you want to delete Foundation Path? This will permanently remove this learning path and its course sequence.',
        );
    });

    it('D14 — a null pending path computes the closed-state copy', () => {
        // The ?. arm — the string is computed on every render
        // before a delete starts, but the Radix portal is
        // unmounted while the dialog is closed, so it is never
        // displayed. Pinned as-is.
        expect(learningPathDeleteDescription(null)).toBe(
            'Are you sure you want to delete undefined? This will permanently remove this learning path and its course sequence.',
        );
    });

    it('D15 — the post-delete pagination is the live clamp', () => {
        // The Users page needed an explicit pageAfterDelete helper
        // because its pagination does not clamp live; this page's
        // paginateCourses already does, so deleting the only item
        // on the last page falls the page back by construction.
        const remaining = LEARNING_PATHS.filter((path) => path.id !== 3);

        const { safePage, items, totalPages } = paginateCourses(
            remaining,
            2,
            2,
        );

        expect(safePage).toBe(1);
        expect(items.map((path) => path.id)).toEqual([1, 2]);
        expect(totalPages).toBe(1);
    });
});

describe('SORT_OPTIONS', () => {
    it('the page ships its six sort pairs', () => {
        expect(SORT_OPTIONS.map((option) => option.label)).toEqual([
            'Title: A - Z',
            'Title: Z - A',
            'Duration: Low to High',
            'Duration: High to Low',
            'Courses: Low to High',
            'Courses: High to Low',
        ]);
    });
});
