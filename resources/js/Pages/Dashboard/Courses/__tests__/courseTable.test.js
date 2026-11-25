/**
 * Courses table pipeline tests.
 *
 * Covers every decision in courseTable.js:
 *
 *  filterCourses
 *   D1  empty-query short-circuit            (empty → all / non-empty)
 *   D2  searchable fields                    (title / short_description
 *       match → kept, none match → dropped)
 *   D3  case-insensitive search
 *   D4  null title is safe                   (blank draft rows)
 *   D5  null short_description is safe       (blank draft rows)
 *   D6  category filter                     (All / match / mismatch)
 *   D7  AND composition                     (search + category)
 *
 *  sortCourses
 *   D8  unknown label → default fallback; a custom options set
 *       sorts by its own labels (sibling management pages reuse
 *       the comparator)
 *   D9  string fields sort case-insensitively
 *   D10 numeric fields pass through
 *   D11 asc / desc direction
 *
 *  paginateCourses
 *   D12 slice windows                       (first / middle / partial last)
 *   D13 page beyond range → safePage clamps to totalPages
 *   D14 totalPages floors at 1              (empty list)
 *   D15 safePage keeps a valid page
 *
 *  shouldShowReset
 *   D16 each of the three conditions triggers (3 cases)
 *   D17 all defaults → false
 *
 *  formatDuration
 *   D18 hours > 0 → "Xh Ym"
 *   D19 hours = 0 boundary → "Ym"
 *
 *  categoryThemeFor
 *   D20 known category → its theme
 *   D21 unknown / null category → default theme (draft rows)
 *
 *  categoryBadgeFor
 *   D22 category present → itself
 *   D23 null or empty → 'Uncategorized'
 *
 *  hasDeletableId
 *   D24 course with id → true
 *   D25 null course / missing id → false (both ?. arms)
 */
import { describe, it, expect } from 'vitest';
import {
    DEFAULT_SORT,
    filterCourses,
    sortCourses,
    paginateCourses,
    shouldShowReset,
    formatDuration,
    categoryThemeFor,
    categoryBadgeFor,
    hasDeletableId,
} from '../courseTable';

/** Mirrors the CourseController::index map shape. */
const COURSES = [
    {
        id: 1,
        title: 'TOEFL Reading Basics',
        short_description: 'Learn skimming',
        category: 'Reading Comprehension',
        total_duration: 125,
        modules_count: 4,
        total_points: 100,
    },
    {
        id: 2,
        title: 'Listening Lab',
        short_description: 'Audio drills',
        category: 'Listening Comprehension',
        total_duration: 45,
        modules_count: 2,
        total_points: 50,
    },
    {
        id: 3,
        title: 'Structure Pro',
        short_description: 'Grammar drills',
        category: 'Structure and Writing Expression',
        total_duration: 90,
        modules_count: 3,
        total_points: 80,
    },
];

const NO_FILTERS = { query: '', categoryFilter: 'All' };

describe('filterCourses', () => {
    it('D1 — an empty query returns every course', () => {
        expect(filterCourses(COURSES, NO_FILTERS)).toHaveLength(3);
    });

    it('D2 — matches on title', () => {
        const result = filterCourses(COURSES, {
            ...NO_FILTERS,
            query: 'toefl',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('D2 — matches on short_description', () => {
        const result = filterCourses(COURSES, {
            ...NO_FILTERS,
            query: 'audio',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D2 — drops courses that match no field', () => {
        expect(
            filterCourses(COURSES, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
    });

    it('D3 — the search is case-insensitive both ways', () => {
        expect(
            filterCourses(COURSES, { ...NO_FILTERS, query: 'LISTENING' }),
        ).toHaveLength(1);

        expect(
            filterCourses(COURSES, { ...NO_FILTERS, query: 'skimming' }),
        ).toHaveLength(1);
    });

    it('D4 — a null title does not crash the search (blank draft row)', () => {
        const withDraft = [
            ...COURSES,
            {
                id: 4,
                title: null,
                short_description: 'Drills for writing',
                category: null,
            },
        ];

        const result = filterCourses(withDraft, {
            ...NO_FILTERS,
            query: 'writing',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(4);
    });

    it('D5 — a null short_description does not crash the search', () => {
        const withNullDesc = [
            ...COURSES,
            {
                id: 5,
                title: 'Mock Tests',
                short_description: null,
                category: 'Reading Comprehension',
            },
        ];

        const result = filterCourses(withNullDesc, {
            ...NO_FILTERS,
            query: 'mock',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(5);
    });

    it('D5 — a null short_description is reached safely when the title misses', () => {
        const withNullDesc = [
            {
                id: 6,
                title: 'Mock Tests',
                short_description: null,
                category: 'Reading Comprehension',
            },
        ];

        // The title misses the query, so the || chain falls through
        // to the null description — the exact path that would crash
        // without the ?? '' guard.
        expect(
            filterCourses(withNullDesc, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
    });

    it('D6 — the category filter matches the exact category', () => {
        const result = filterCourses(COURSES, {
            ...NO_FILTERS,
            categoryFilter: 'Listening Comprehension',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D6 — the category filter drops non-matching categories', () => {
        expect(
            filterCourses(COURSES, {
                ...NO_FILTERS,
                categoryFilter: 'Reading Comprehension',
            }),
        ).toHaveLength(1);
    });

    it('D7 — search and category compose with AND', () => {
        // Matches the search but not the category → dropped.
        expect(
            filterCourses(COURSES, {
                query: 'drills',
                categoryFilter: 'Reading Comprehension',
            }),
        ).toHaveLength(0);

        // Matches both → kept.
        expect(
            filterCourses(COURSES, {
                query: 'grammar',
                categoryFilter: 'Structure and Writing Expression',
            }),
        ).toHaveLength(1);
    });
});

describe('sortCourses', () => {
    it('D8 — an unknown label falls back to the default sort', () => {
        const shuffled = [COURSES[2], COURSES[0], COURSES[1]];

        const sorted = sortCourses(shuffled, 'Not A Real Label');

        expect(sorted.map((course) => course.title)).toEqual(
            sortCourses(shuffled, DEFAULT_SORT.label).map(
                (course) => course.title,
            ),
        );
    });

    it('D8 — a custom options set sorts by its own labels', () => {
        // The comparator is generalized so sibling management pages
        // (the challenges index) can pass their own label set —
        // unknown labels fall back to the first of those options.
        const custom = [
            {
                label: 'Total Points: Low to High',
                field: 'total_points',
                direction: 'asc',
            },
            {
                label: 'Total Points: High to Low',
                field: 'total_points',
                direction: 'desc',
            },
        ];

        expect(
            sortCourses(COURSES, 'Total Points: Low to High', custom).map(
                (course) => course.total_points,
            ),
        ).toEqual([50, 80, 100]);

        expect(
            sortCourses(COURSES, 'Not A Real Label', custom).map(
                (course) => course.total_points,
            ),
        ).toEqual([50, 80, 100]);
    });

    it('D9 — string fields sort case-insensitively', () => {
        const mixed = [
            { id: 1, title: 'banana' },
            { id: 2, title: 'Apple' },
        ];

        expect(
            sortCourses(mixed, 'Title: A - Z').map((course) => course.id),
        ).toEqual([2, 1]);
    });

    it('D10 — numeric fields sort numerically', () => {
        expect(
            sortCourses(COURSES, 'Duration: Low to High').map(
                (course) => course.total_duration,
            ),
        ).toEqual([45, 90, 125]);
    });

    it('D11 — desc reverses the order', () => {
        expect(
            sortCourses(COURSES, 'Duration: High to Low').map(
                (course) => course.total_duration,
            ),
        ).toEqual([125, 90, 45]);
    });
});

describe('paginateCourses', () => {
    const FIVE = COURSES.concat([
        {
            id: 4,
            title: 'Extra A',
            short_description: 'a',
            category: 'Reading Comprehension',
            total_duration: 10,
            modules_count: 1,
            total_points: 5,
        },
        {
            id: 5,
            title: 'Extra B',
            short_description: 'b',
            category: 'Reading Comprehension',
            total_duration: 20,
            modules_count: 1,
            total_points: 5,
        },
    ]);

    it('D12 — slices the first page', () => {
        const { items, totalPages, safePage } = paginateCourses(FIVE, 1, 2);

        expect(items.map((course) => course.id)).toEqual([1, 2]);
        expect(totalPages).toBe(3);
        expect(safePage).toBe(1);
    });

    it('D12 — slices a middle page', () => {
        const { items, safePage } = paginateCourses(FIVE, 2, 2);

        expect(items.map((course) => course.id)).toEqual([3, 4]);
        expect(safePage).toBe(2);
    });

    it('D12 — slices the partial last page', () => {
        const { items } = paginateCourses(FIVE, 3, 2);

        expect(items.map((course) => course.id)).toEqual([5]);
    });

    it('D13 — a page beyond the range clamps to the last page', () => {
        const { items, safePage } = paginateCourses(FIVE, 9, 2);

        expect(safePage).toBe(3);
        expect(items.map((course) => course.id)).toEqual([5]);
    });

    it('D14 — totalPages floors at 1 for an empty list', () => {
        const { items, totalPages, safePage } = paginateCourses([], 4, 2);

        expect(items).toHaveLength(0);
        expect(totalPages).toBe(1);
        expect(safePage).toBe(1);
    });

    it('D15 — keeps the page when it is still valid', () => {
        const { safePage } = paginateCourses(FIVE, 2, 2);

        expect(safePage).toBe(2);
    });
});

describe('shouldShowReset', () => {
    const DEFAULTS = {
        searchQuery: '',
        categoryFilter: 'All',
        sortLabel: DEFAULT_SORT.label,
    };

    it('D16 — a dirty search query shows the reset button', () => {
        expect(shouldShowReset({ ...DEFAULTS, searchQuery: 'toefl' })).toBe(
            true,
        );
    });

    it('D16 — a category filter shows the reset button', () => {
        expect(
            shouldShowReset({
                ...DEFAULTS,
                categoryFilter: 'Listening Comprehension',
            }),
        ).toBe(true);
    });

    it('D16 — a non-default sort shows the reset button', () => {
        expect(
            shouldShowReset({
                ...DEFAULTS,
                sortLabel: 'Duration: Low to High',
            }),
        ).toBe(true);
    });

    it('D17 — all defaults hide the reset button', () => {
        expect(shouldShowReset(DEFAULTS)).toBe(false);
    });
});

describe('formatDuration', () => {
    it('D18 — durations over an hour render hours and minutes', () => {
        expect(formatDuration(125)).toBe('2h 5m');
    });

    it('D19 — sub-hour durations render minutes only', () => {
        expect(formatDuration(45)).toBe('45m');
    });

    it('D19 — a full hour renders with zero minutes', () => {
        expect(formatDuration(60)).toBe('1h 0m');
    });
});

describe('categoryThemeFor', () => {
    const CATEGORY_MAP = {
        'Reading Comprehension': { gradient: 'reading-gradient' },
        'Listening Comprehension': { gradient: 'listening-gradient' },
    };

    it('D20 — a known category returns its own theme', () => {
        expect(
            categoryThemeFor('Listening Comprehension', CATEGORY_MAP),
        ).toEqual({ gradient: 'listening-gradient' });
    });

    it('D21 — an unknown category falls back to the default theme', () => {
        expect(categoryThemeFor('Kedokteran', CATEGORY_MAP)).toEqual({
            gradient: 'reading-gradient',
        });
    });

    it('D21 — a null category (draft row) falls back to the default theme', () => {
        expect(categoryThemeFor(null, CATEGORY_MAP)).toEqual({
            gradient: 'reading-gradient',
        });
    });

    it('D21 — a custom fallback key wins (the learning paths generalization)', () => {
        // The admin learning paths' theme map falls back to its
        // own key ('All Levels', the map's last entry) — the
        // third parameter keeps the courses' default backward
        // compatible.
        const LEVEL_MAP = {
            Beginner: { gradient: 'beginner-gradient' },
            'All Levels': { gradient: 'all-gradient' },
        };

        expect(
            categoryThemeFor('Quantum Level', LEVEL_MAP, 'All Levels'),
        ).toEqual({ gradient: 'all-gradient' });
        expect(categoryThemeFor(null, LEVEL_MAP, 'All Levels')).toEqual({
            gradient: 'all-gradient',
        });
    });
});

describe('categoryBadgeFor', () => {
    it('D22 — a present category is its own badge text', () => {
        expect(categoryBadgeFor('Reading Comprehension')).toBe(
            'Reading Comprehension',
        );
    });

    it("D23 — a null category badges as 'Uncategorized'", () => {
        expect(categoryBadgeFor(null)).toBe('Uncategorized');
    });

    it("D23 — an empty category badges as 'Uncategorized'", () => {
        expect(categoryBadgeFor('')).toBe('Uncategorized');
    });
});

describe('hasDeletableId', () => {
    it('D24 — a course with an id is deletable', () => {
        expect(hasDeletableId({ id: 7 })).toBe(true);
    });

    it('D25 — a null course is not deletable', () => {
        expect(hasDeletableId(null)).toBe(false);
    });

    it('D25 — a course without an id is not deletable', () => {
        expect(hasDeletableId({ title: 'Draft' })).toBe(false);
    });
});
