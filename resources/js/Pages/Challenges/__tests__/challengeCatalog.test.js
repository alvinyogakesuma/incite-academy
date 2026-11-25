/**
 * Student challenges catalog tests.
 *
 * Covers the challenges-specific decision (filterChallenges) and
 * pins the field-agnostic sort reuse on this page's fields:
 *
 *  filterChallenges
 *   D1  search guard              (empty query → all / query → filter)
 *   D2  searchable fields         (title / description / no match)
 *   D3  null-safe fields          (null description reached safely
 *                                 when the title misses — the
 *                                 short-circuit lesson)
 *   D4  category filter           (none → all / selection → includes)
 *   D5  AND composition           (search + category)
 *
 *  sortCourses (reused from courseCatalog)
 *   D6  the comparator sorts this page's fields — points asc/desc,
 *       duration asc — numerically
 *   D7  unknown sort value probe  (order preserved)
 */
import { describe, it, expect } from 'vitest';
import { filterChallenges, SORT_OPTIONS } from '../challengeCatalog';
import {
    seedCategories,
    sortCourses,
    toggleCategory,
} from '@/Pages/Courses/courseCatalog';

/** Mirrors the student ChallengeController::index map shape. */
const CHALLENGES = [
    {
        id: 1,
        title: 'TOEFL Reading Sprint',
        description: 'Timed skimming drills',
        category: 'Reading Comprehension',
        points: 40,
        duration: 15,
    },
    {
        id: 2,
        title: 'Listening Gauntlet',
        description: 'Dictation under pressure',
        category: 'Listening Comprehension',
        points: 60,
        duration: 25,
    },
    {
        id: 3,
        title: 'Structure Duel',
        description: 'Grammar rapid fire',
        category: 'Structure and Writing Expression',
        points: 30,
        duration: 10,
    },
];

const NO_FILTERS = { searchQuery: '', selectedCategories: [] };

describe('seedCategories / toggleCategory (reused from courseCatalog)', () => {
    it('D1 (catalog) — the deep-link seed and toggle behave identically here', () => {
        expect(seedCategories('Listening Comprehension')).toEqual([
            'Listening Comprehension',
        ]);
        expect(seedCategories(null)).toEqual([]);

        expect(
            toggleCategory(
                ['Reading Comprehension'],
                'Listening Comprehension',
            ),
        ).toEqual(['Reading Comprehension', 'Listening Comprehension']);
        expect(
            toggleCategory(
                ['Listening Comprehension'],
                'Listening Comprehension',
            ),
        ).toEqual([]);
    });
});

describe('filterChallenges — search', () => {
    it('D1 — an empty query returns every challenge', () => {
        expect(filterChallenges(CHALLENGES, NO_FILTERS)).toHaveLength(3);
    });

    it('D2 — matches on title', () => {
        const result = filterChallenges(CHALLENGES, {
            ...NO_FILTERS,
            searchQuery: 'sprint',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('D2 — matches on description', () => {
        const result = filterChallenges(CHALLENGES, {
            ...NO_FILTERS,
            searchQuery: 'dictation',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D2 — drops challenges that match no field', () => {
        expect(
            filterChallenges(CHALLENGES, {
                ...NO_FILTERS,
                searchQuery: 'zzz',
            }),
        ).toHaveLength(0);
    });

    it('D3 — a null description is reached safely when the title misses', () => {
        const withNullDesc = [
            ...CHALLENGES,
            {
                id: 4,
                title: 'Mock Duel',
                description: null,
                category: 'Reading Comprehension',
                points: 10,
                duration: 5,
            },
        ];

        // Title misses, so the || chain falls through to the null
        // description — the guard keeps the search crash-free.
        expect(
            filterChallenges(withNullDesc, {
                ...NO_FILTERS,
                searchQuery: 'zzz',
            }),
        ).toHaveLength(0);

        // The title still matches with the description null.
        expect(
            filterChallenges(withNullDesc, {
                ...NO_FILTERS,
                searchQuery: 'mock',
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
                description: 'Untitled duel draft',
                category: 'Reading Comprehension',
                points: 10,
                duration: 5,
            },
        ];

        expect(
            filterChallenges(withNullTitle, {
                ...NO_FILTERS,
                searchQuery: 'duel',
            }),
        ).toHaveLength(1);

        expect(
            filterChallenges(withNullTitle, {
                ...NO_FILTERS,
                searchQuery: 'zzz',
            }),
        ).toHaveLength(0);
    });
});

describe('filterChallenges — category', () => {
    it('D4 — no selection returns every challenge', () => {
        expect(filterChallenges(CHALLENGES, NO_FILTERS)).toHaveLength(3);
    });

    it('D4 — a selection keeps only its categories', () => {
        const result = filterChallenges(CHALLENGES, {
            ...NO_FILTERS,
            selectedCategories: ['Listening Comprehension'],
        });

        expect(result.map((challenge) => challenge.id)).toEqual([2]);
    });
});

describe('filterChallenges — composition', () => {
    it('D5 — search and category compose with AND', () => {
        expect(
            filterChallenges(CHALLENGES, {
                searchQuery: 'drills',
                selectedCategories: ['Reading Comprehension'],
            }),
        ).toHaveLength(1);
    });
});

describe('sortCourses — the comparator on this page’s fields', () => {
    it('D6 — points sort numerically in both directions', () => {
        expect(
            sortCourses(CHALLENGES, 'points-asc').map((c) => c.points),
        ).toEqual([30, 40, 60]);
        expect(
            sortCourses(CHALLENGES, 'points-desc').map((c) => c.points),
        ).toEqual([60, 40, 30]);
    });

    it('D6 — duration sorts numerically', () => {
        expect(
            sortCourses(CHALLENGES, 'duration-asc').map((c) => c.duration),
        ).toEqual([10, 15, 25]);
    });

    it('D7 — an unknown sort value preserves the incoming order', () => {
        expect(
            sortCourses([...CHALLENGES].reverse(), 'bogus').map(
                (challenge) => challenge.id,
            ),
        ).toEqual([3, 2, 1]);
    });
});

describe('SORT_OPTIONS', () => {
    it('the page ships its six sort pairs', () => {
        expect(SORT_OPTIONS.map((option) => option.value)).toEqual([
            'title-asc',
            'title-desc',
            'duration-asc',
            'duration-desc',
            'points-asc',
            'points-desc',
        ]);
    });
});
