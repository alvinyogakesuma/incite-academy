/**
 * Student learning paths catalog tests.
 *
 * Covers the learning-paths-specific decision (filterLearningPaths)
 * and pins the field-agnostic reuse on this page's fields:
 *
 *  seedCategories / toggleCategory (reused from courseCatalog)
 *   D1  the deep-link seed and toggle behave identically on levels
 *
 *  filterLearningPaths
 *   D2  search guard              (empty query → all / query → filter)
 *   D3  searchable fields         (title / description / no match)
 *   D4  null-safe fields          (both ?? '' arms — defensive-only:
 *                                 the migration ships title and
 *                                 description NOT NULL)
 *   D5  level filter              (none → all / one level / the
 *                                 multi-select OR)
 *   D6  AND composition           (search + level)
 *
 *  sortCourses (reused from courseCatalog)
 *   D7  title sorts case-insensitively in both directions
 *   D8  the numeric fields sort both ways (total_duration,
 *       courses_count)
 *   D9  equal values keep their order (the equality arm)
 *   D10 unknown sort value probe  (order preserved)
 *
 *  Reuse pins and contracts
 *   D11 formatDuration — the fifth verbatim duplicate eliminated
 *       (the card's copy deleted; the covered courseTable home)
 *   D12 SORT_OPTIONS — the page's six sort pairs
 *   D13 the unvalidated deep link — a garbage ?level= seeds a
 *       selection that filters everything out (pinned contract)
 *   D14 the full pipeline — filter then sort chained (the page's
 *       useMemo shape)
 */
import { describe, it, expect } from 'vitest';
import { SORT_OPTIONS, filterLearningPaths } from '../learningPathCatalog';
import { formatDuration } from '@/Pages/Dashboard/Courses/courseTable';
import {
    seedCategories,
    sortCourses,
    toggleCategory,
} from '@/Pages/Courses/courseCatalog';

/** Mirrors the student LearningPathController::index map shape. */
const LEARNING_PATHS = [
    {
        id: 1,
        title: 'TOEFL Foundation Path',
        description: 'Build the basics from scratch',
        level: 'Beginner',
        total_duration: 480,
        courses_count: 5,
    },
    {
        id: 2,
        title: 'advanced Mastery Journey',
        description: 'Polish every skill for the exam',
        level: 'Advanced',
        total_duration: 720,
        courses_count: 8,
    },
    {
        id: 3,
        title: 'Listening Immersion Track',
        description: 'Ear training first',
        level: 'Intermediate',
        total_duration: 360,
        courses_count: 4,
    },
];

const NO_FILTERS = { searchQuery: '', selectedLevels: [] };

describe('seedCategories / toggleCategory (reused from courseCatalog)', () => {
    it('D1 — the deep-link seed and toggle behave identically on levels', () => {
        expect(seedCategories('Beginner')).toEqual(['Beginner']);
        expect(seedCategories(null)).toEqual([]);

        expect(toggleCategory(['Beginner'], 'Advanced')).toEqual([
            'Beginner',
            'Advanced',
        ]);
        expect(toggleCategory(['Beginner'], 'Beginner')).toEqual([]);
    });
});

describe('filterLearningPaths — search', () => {
    it('D2 — an empty query returns every path', () => {
        expect(filterLearningPaths(LEARNING_PATHS, NO_FILTERS)).toHaveLength(3);
    });

    it('D3 — matches on title', () => {
        const result = filterLearningPaths(LEARNING_PATHS, {
            ...NO_FILTERS,
            searchQuery: 'foundation',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('D3 — matches on description', () => {
        const result = filterLearningPaths(LEARNING_PATHS, {
            ...NO_FILTERS,
            searchQuery: 'ear training',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('D3 — drops paths that match no field', () => {
        expect(
            filterLearningPaths(LEARNING_PATHS, {
                ...NO_FILTERS,
                searchQuery: 'zzz',
            }),
        ).toHaveLength(0);
    });
});

describe('filterLearningPaths — null-safety', () => {
    it('D4 — a null description is reached safely when the title misses', () => {
        const withNullDesc = [
            ...LEARNING_PATHS,
            {
                id: 4,
                title: 'Mock Journey',
                description: null,
                level: 'Beginner',
                total_duration: 120,
                courses_count: 2,
            },
        ];

        // Title misses, so the || chain falls through to the null
        // description — the guard keeps the search crash-free.
        expect(
            filterLearningPaths(withNullDesc, {
                ...NO_FILTERS,
                searchQuery: 'zzz',
            }),
        ).toHaveLength(0);

        // The title still matches with the description null.
        expect(
            filterLearningPaths(withNullDesc, {
                ...NO_FILTERS,
                searchQuery: 'mock',
            }),
        ).toHaveLength(1);
    });

    it('D4 — a null title is reached safely when the description matches', () => {
        // Mirror arm: the title null-guard's fallback is reached
        // only when a description exists and the title misses it.
        const withNullTitle = [
            {
                id: 5,
                title: null,
                description: 'A draft journey description',
                level: 'Beginner',
                total_duration: 120,
                courses_count: 2,
            },
        ];

        expect(
            filterLearningPaths(withNullTitle, {
                ...NO_FILTERS,
                searchQuery: 'draft',
            }),
        ).toHaveLength(1);

        expect(
            filterLearningPaths(withNullTitle, {
                ...NO_FILTERS,
                searchQuery: 'zzz',
            }),
        ).toHaveLength(0);
    });
});

describe('filterLearningPaths — level', () => {
    it('D5 — no selection returns every path', () => {
        expect(filterLearningPaths(LEARNING_PATHS, NO_FILTERS)).toHaveLength(3);
    });

    it('D5 — one selected level keeps only its paths', () => {
        const result = filterLearningPaths(LEARNING_PATHS, {
            ...NO_FILTERS,
            selectedLevels: ['Advanced'],
        });

        expect(result.map((path) => path.id)).toEqual([2]);
    });

    it('D5 — a multi-level selection is an OR', () => {
        const result = filterLearningPaths(LEARNING_PATHS, {
            ...NO_FILTERS,
            selectedLevels: ['Beginner', 'Intermediate'],
        });

        expect(result.map((path) => path.id)).toEqual([1, 3]);
    });
});

describe('filterLearningPaths — composition', () => {
    it('D6 — search and level compose with AND', () => {
        expect(
            filterLearningPaths(LEARNING_PATHS, {
                searchQuery: 'journey',
                selectedLevels: ['Advanced'],
            }),
        ).toHaveLength(1);

        expect(
            filterLearningPaths(LEARNING_PATHS, {
                searchQuery: 'journey',
                selectedLevels: ['Beginner'],
            }),
        ).toHaveLength(0);
    });
});

describe('sortCourses — the comparator on this page’s fields', () => {
    it('D7 — titles sort case-insensitively in both directions', () => {
        // 'advanced...' < 'listening...' < 'toefl...' once both
        // sides are lowercased.
        expect(
            sortCourses(LEARNING_PATHS, 'title-asc').map((path) => path.id),
        ).toEqual([2, 3, 1]);
        expect(
            sortCourses(LEARNING_PATHS, 'title-desc').map((path) => path.id),
        ).toEqual([1, 3, 2]);
    });

    it('D8 — total_duration sorts numerically in both directions', () => {
        expect(
            sortCourses(LEARNING_PATHS, 'total_duration-asc').map(
                (path) => path.id,
            ),
        ).toEqual([3, 1, 2]);
        expect(
            sortCourses(LEARNING_PATHS, 'total_duration-desc').map(
                (path) => path.id,
            ),
        ).toEqual([2, 1, 3]);
    });

    it('D8 — courses_count sorts numerically in both directions', () => {
        expect(
            sortCourses(LEARNING_PATHS, 'courses_count-asc').map(
                (path) => path.id,
            ),
        ).toEqual([3, 1, 2]);
        expect(
            sortCourses(LEARNING_PATHS, 'courses_count-desc').map(
                (path) => path.id,
            ),
        ).toEqual([2, 1, 3]);
    });

    it('D9 — equal values keep their incoming order (the equality arm)', () => {
        const withTies = [
            ...LEARNING_PATHS,
            {
                id: 4,
                title: 'Reading Sprint Track',
                description: 'Fast skimming drills',
                level: 'Intermediate',
                total_duration: 360,
                courses_count: 4,
            },
        ];

        // Paths 3 and 4 tie on both fields; the stable sort keeps
        // their incoming positions.
        expect(
            sortCourses(withTies, 'courses_count-asc').map((path) => path.id),
        ).toEqual([3, 4, 1, 2]);
    });

    it('D10 — an unknown sort value preserves the incoming order', () => {
        expect(
            sortCourses([...LEARNING_PATHS].reverse(), 'bogus').map(
                (path) => path.id,
            ),
        ).toEqual([3, 2, 1]);
    });
});

describe('reuse pins and contracts', () => {
    it('D11 — formatDuration renders hours and minutes (the card\u2019s copy eliminated)', () => {
        // The card's fifth verbatim duplicate now rides the
        // covered courseTable home.
        expect(formatDuration(15)).toBe('15m');
        expect(formatDuration(125)).toBe('2h 5m');
    });

    it('D12 — the page ships its six sort pairs', () => {
        expect(SORT_OPTIONS.map((option) => option.value)).toEqual([
            'title-asc',
            'title-desc',
            'total_duration-asc',
            'total_duration-desc',
            'courses_count-asc',
            'courses_count-desc',
        ]);
    });

    it('D13 — an unvalidated garbage deep link filters everything out', () => {
        // The seed takes any ?level= value; a garbage level yields
        // a selection no path matches — the empty state shows, and
        // no sidebar checkbox renders selected (the options come
        // from the levels prop). Pinned as the current contract.
        const seeded = seedCategories('Quantum Physics');

        expect(
            filterLearningPaths(LEARNING_PATHS, {
                searchQuery: '',
                selectedLevels: seeded,
            }),
        ).toHaveLength(0);
    });

    it('D14 — the full pipeline chains filter then sort', () => {
        // The page's useMemo shape: filterLearningPaths feeds
        // sortCourses.
        const result = sortCourses(
            filterLearningPaths(LEARNING_PATHS, {
                searchQuery: '',
                selectedLevels: ['Intermediate'],
            }),
            'title-asc',
        );

        expect(result.map((path) => path.id)).toEqual([3]);
    });
});
