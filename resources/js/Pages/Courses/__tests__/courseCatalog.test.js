/**
 * Student course catalog pipeline tests.
 *
 * Covers every decision in courseCatalog.js:
 *
 *  seedCategories
 *   D1  deep-link seed             (param → [param] / null → [])
 *
 *  toggleCategory
 *   D2  selection toggle          (append / remove)
 *
 *  filterCourses
 *   D3  search guard              (empty query → all / query → filter)
 *   D4  searchable fields         (title / short_description / none)
 *   D5  short_description null-safe (the ?. arm)
 *   D6  title unguarded — documented asymmetry (DD note: unreachable
 *       because publishing requires a title)
 *   D7  category filter           (none → all / selection → includes)
 *
 *  progressMatches
 *   D8  four-way dispatch         (not_started / in_progress /
 *                                  completed / fallthrough)
 *   D9  missing progress          (null → 0 → not_started matches)
 *
 *  sortCourses
 *   D10 direction flip            (asc / desc)
 *   D11 string arm vs numeric arm (case-insensitive / passthrough)
 *   D12 equal values              (comparator returns 0)
 *   D13 unknown sort value probe  (order preserved)
 */
import { describe, it, expect } from 'vitest';
import {
    filterCourses,
    progressMatches,
    seedCategories,
    sortCourses,
    toggleCategory,
} from '../courseCatalog';

/** Mirrors the student CourseController::index map shape. */
const COURSES = [
    {
        id: 1,
        title: 'TOEFL Reading Basics',
        short_description: 'Skimming and scanning drills',
        category: 'Reading Comprehension',
        progress: 0,
        total_duration: 120,
        lessons_count: 8,
    },
    {
        id: 2,
        title: 'Listening Lab',
        short_description: 'Audio dictation practice',
        category: 'Listening Comprehension',
        progress: 50,
        total_duration: 45,
        lessons_count: 4,
    },
    {
        id: 3,
        title: 'Structure Workshop',
        short_description: 'Grammar and writing',
        category: 'Structure and Writing Expression',
        progress: 100,
        total_duration: 90,
        lessons_count: 6,
    },
];

const NO_FILTERS = {
    searchQuery: '',
    selectedCategories: [],
    progressFilter: 'all',
};

describe('seedCategories', () => {
    it('D1 — a ?category= deep link seeds the filter', () => {
        expect(seedCategories('Listening Comprehension')).toEqual([
            'Listening Comprehension',
        ]);
    });

    it('D1 — no deep link starts with nothing selected', () => {
        expect(seedCategories(null)).toEqual([]);
    });
});

describe('toggleCategory', () => {
    it('D2 — an unselected category appends to the selection', () => {
        expect(
            toggleCategory(
                ['Reading Comprehension'],
                'Listening Comprehension',
            ),
        ).toEqual(['Reading Comprehension', 'Listening Comprehension']);
    });

    it('D2 — an already-selected category removes itself', () => {
        expect(
            toggleCategory(
                ['Reading Comprehension', 'Listening Comprehension'],
                'Reading Comprehension',
            ),
        ).toEqual(['Listening Comprehension']);
    });
});

describe('filterCourses — search', () => {
    it('D3 — an empty query returns every course', () => {
        expect(filterCourses(COURSES, NO_FILTERS)).toHaveLength(3);
    });

    it('D4 — matches on title', () => {
        const result = filterCourses(COURSES, {
            ...NO_FILTERS,
            searchQuery: 'toefl',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('D4 — matches on short_description', () => {
        const result = filterCourses(COURSES, {
            ...NO_FILTERS,
            searchQuery: 'dictation',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D4 — drops courses that match no field', () => {
        expect(
            filterCourses(COURSES, { ...NO_FILTERS, searchQuery: 'zzz' }),
        ).toHaveLength(0);
    });

    it('D5 — a null short_description never crashes the search', () => {
        const withNullDesc = [
            ...COURSES,
            {
                id: 4,
                title: 'Mock Tests',
                short_description: null,
                category: 'Reading Comprehension',
                progress: 0,
            },
        ];

        // Title still matches with the description null.
        const byTitle = filterCourses(withNullDesc, {
            ...NO_FILTERS,
            searchQuery: 'mock',
        });

        expect(byTitle).toHaveLength(1);
        expect(byTitle[0].id).toBe(4);

        // A query that could only match the null description finds
        // nothing, without throwing on the ?. arm.
        expect(
            filterCourses(withNullDesc, {
                ...NO_FILTERS,
                searchQuery: 'description',
            }),
        ).toHaveLength(0);
    });

    it('D6 — the unguarded title is the documented asymmetry (unreachable)', () => {
        // DD note: title is searched without a null guard while
        // short_description is optional-chained. Published courses
        // always carry titles (the publish path rides the update
        // validation where title is required), so a null title is
        // unreachable — the throw below is pinned as the current
        // contract, mirroring the documented Login asymmetry.
        const withNullTitle = [
            {
                id: 5,
                title: null,
                short_description: 'desc',
                category: 'Reading Comprehension',
                progress: 0,
            },
        ];

        expect(() =>
            filterCourses(withNullTitle, {
                ...NO_FILTERS,
                searchQuery: 'zzz',
            }),
        ).toThrow();
    });
});

describe('filterCourses — category', () => {
    it('D7 — no selection returns every course', () => {
        expect(filterCourses(COURSES, NO_FILTERS)).toHaveLength(3);
    });

    it('D7 — a selection keeps only its categories', () => {
        const result = filterCourses(COURSES, {
            ...NO_FILTERS,
            selectedCategories: [
                'Reading Comprehension',
                'Listening Comprehension',
            ],
        });

        expect(result.map((course) => course.id)).toEqual([1, 2]);
    });
});

describe('progressMatches', () => {
    it('D8 — not_started keeps zero progress only', () => {
        expect(progressMatches(0, 'not_started')).toBe(true);
        expect(progressMatches(50, 'not_started')).toBe(false);
    });

    it('D8 — in_progress keeps the middle band only', () => {
        expect(progressMatches(50, 'in_progress')).toBe(true);
        expect(progressMatches(0, 'in_progress')).toBe(false);
        expect(progressMatches(100, 'in_progress')).toBe(false);
    });

    it('D8 — completed keeps full progress only', () => {
        expect(progressMatches(100, 'completed')).toBe(true);
        expect(progressMatches(99, 'completed')).toBe(false);
    });

    it('D8 — unknown filters fall through to true', () => {
        expect(progressMatches(0, 'bogus')).toBe(true);
    });

    it('D9 — a missing progress counts as not started', () => {
        expect(progressMatches(null, 'not_started')).toBe(true);
        expect(progressMatches(null, 'in_progress')).toBe(false);
    });
});

describe('filterCourses — progress', () => {
    it('D8 — the progress filter composes with the rest', () => {
        const result = filterCourses(COURSES, {
            ...NO_FILTERS,
            progressFilter: 'in_progress',
        });

        expect(result.map((course) => course.id)).toEqual([2]);
    });

    it("D3 — 'all' skips the progress filter entirely", () => {
        expect(filterCourses(COURSES, NO_FILTERS)).toHaveLength(3);
    });
});

describe('sortCourses', () => {
    it('D10 — asc orders by the field ascending', () => {
        expect(
            sortCourses(COURSES, 'total_duration-asc').map(
                (course) => course.total_duration,
            ),
        ).toEqual([45, 90, 120]);
    });

    it('D10 — desc flips the order', () => {
        expect(
            sortCourses(COURSES, 'total_duration-desc').map(
                (course) => course.total_duration,
            ),
        ).toEqual([120, 90, 45]);
    });

    it('D11 — string fields sort case-insensitively', () => {
        const mixed = [
            { id: 1, title: 'banana' },
            { id: 2, title: 'Apple' },
        ];

        expect(sortCourses(mixed, 'title-asc').map((c) => c.id)).toEqual([
            2, 1,
        ]);
    });

    it('D11 — numeric fields pass through without case handling', () => {
        expect(
            sortCourses(COURSES, 'lessons_count-asc').map(
                (course) => course.lessons_count,
            ),
        ).toEqual([4, 6, 8]);
    });

    it('D12 — equal values keep the comparator at zero', () => {
        const twins = [
            { id: 1, title: 'same' },
            { id: 2, title: 'same' },
        ];

        expect(sortCourses(twins, 'title-asc').map((c) => c.id)).toEqual([
            1, 2,
        ]);
    });

    it('D13 — an unknown sort value preserves the incoming order', () => {
        expect(
            sortCourses([...COURSES].reverse(), 'bogus').map(
                (course) => course.id,
            ),
        ).toEqual([3, 2, 1]);
    });
});
