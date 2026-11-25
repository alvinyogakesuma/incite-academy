/**
 * Challenges management table tests.
 *
 * Covers the page-specific decisions in challengeTable.js and
 * pins the courseTable helper reuse on this page's payload:
 *
 *  filterChallenges
 *   D1  search guard              (empty query → all / query → filter)
 *   D2  searchable fields         (title / description / no match)
 *   D3  null-safe fields          (null description reached when the
 *                                 title misses; null title skipped)
 *   D4  category filter           (All / match / mismatch)
 *   D5  AND composition           (search + category)
 *
 *  shouldShowReset
 *   D6  each of the three conditions triggers (3 cases)
 *   D7  all defaults → false
 *
 *  Reuse pins (courseTable helpers on this page's payload)
 *   D8  paginateCourses — the live clamp on this page's data
 *   D9  categoryThemeFor — a null category falls back to the
 *       Reading Comprehension gradient (live-capable: the payload
 *       ships category?->value, nullable)
 *   D10 categoryBadgeFor — a null category badges as Uncategorized
 *   D11 hasDeletableId — the delete guard covers both ?. arms
 *   D12 formatDuration — the fourth duplicate eliminated
 *
 *  The delete flow (challengeTable helpers)
 *   D13 the guard-composed URL — a deletable pending challenge
 *       resolves to the destroy route; null and id-less drafts
 *       resolve to no URL (the early-return arm)
 *   D14 the dialog copy — titled arm and the null closed-state
 *       arm (computed every render, never displayed while the
 *       Radix portal is unmounted)
 *   D15 the post-delete pagination — the live clamp in
 *       paginateCourses handles the shrunken list (no
 *       pageAfterDelete helper needed, unlike the Users page)
 */
import { describe, it, expect } from 'vitest';
import {
    CHALLENGE_CATEGORY_GRADIENTS,
    DEFAULT_SORT,
    challengeDeleteDescription,
    challengeDeleteUrl,
    filterChallenges,
    shouldShowReset,
} from '../challengeTable';
import {
    categoryBadgeFor,
    categoryThemeFor,
    formatDuration,
    hasDeletableId,
    paginateCourses,
} from '@/Pages/Dashboard/Courses/courseTable';

/** Mirrors the Admin ChallengeController::index map shape. */
const CHALLENGES = [
    {
        id: 1,
        title: 'TOEFL Reading Sprint',
        description: 'Timed skimming drills',
        category: 'Reading Comprehension',
        points: 40,
        duration: 15,
        questions_count: 5,
    },
    {
        id: 2,
        title: 'Listening Gauntlet',
        description: 'Dictation under pressure',
        category: 'Listening Comprehension',
        points: 60,
        duration: 25,
        questions_count: 8,
    },
    {
        id: 3,
        title: 'Structure Duel',
        description: 'Grammar rapid fire',
        category: 'Structure and Writing Expression',
        points: 30,
        duration: 10,
        questions_count: 4,
    },
];

const NO_FILTERS = { query: '', categoryFilter: 'All' };

describe('filterChallenges', () => {
    it('D1 — an empty query returns every challenge', () => {
        expect(filterChallenges(CHALLENGES, NO_FILTERS)).toHaveLength(3);
    });

    it('D2 — matches on title', () => {
        const result = filterChallenges(CHALLENGES, {
            ...NO_FILTERS,
            query: 'sprint',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('D2 — matches on description', () => {
        const result = filterChallenges(CHALLENGES, {
            ...NO_FILTERS,
            query: 'dictation',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D2 — drops challenges that match no field', () => {
        expect(
            filterChallenges(CHALLENGES, { ...NO_FILTERS, query: 'zzz' }),
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
                questions_count: 2,
            },
        ];

        // Title misses, so the || chain falls through to the null
        // description — the guard keeps the search crash-free.
        expect(
            filterChallenges(withNullDesc, {
                ...NO_FILTERS,
                query: 'zzz',
            }),
        ).toHaveLength(0);

        // The title still matches with the description null.
        expect(
            filterChallenges(withNullDesc, {
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
                description: 'Untitled duel draft',
                category: 'Reading Comprehension',
                points: 10,
                duration: 5,
                questions_count: 2,
            },
        ];

        expect(
            filterChallenges(withNullTitle, {
                ...NO_FILTERS,
                query: 'duel',
            }),
        ).toHaveLength(1);

        expect(
            filterChallenges(withNullTitle, {
                ...NO_FILTERS,
                query: 'zzz',
            }),
        ).toHaveLength(0);
    });

    it('D4 — the category filter matches the exact category', () => {
        const result = filterChallenges(CHALLENGES, {
            ...NO_FILTERS,
            categoryFilter: 'Listening Comprehension',
        });

        expect(result.map((challenge) => challenge.id)).toEqual([2]);
    });

    it('D4 — the category filter drops non-matching categories', () => {
        expect(
            filterChallenges(CHALLENGES, {
                ...NO_FILTERS,
                categoryFilter: 'Reading Comprehension',
            }),
        ).toHaveLength(1);
    });

    it('D5 — search and category compose with AND', () => {
        expect(
            filterChallenges(CHALLENGES, {
                query: 'drills',
                categoryFilter: 'Listening Comprehension',
            }),
        ).toHaveLength(0);

        expect(
            filterChallenges(CHALLENGES, {
                query: 'gauntlet',
                categoryFilter: 'Listening Comprehension',
            }),
        ).toHaveLength(1);
    });
});

describe('shouldShowReset', () => {
    const DEFAULTS = {
        searchQuery: '',
        categoryFilter: 'All',
        sortLabel: DEFAULT_SORT.label,
    };

    it('D6 — a dirty search query shows the reset button', () => {
        expect(shouldShowReset({ ...DEFAULTS, searchQuery: 'sprint' })).toBe(
            true,
        );
    });

    it('D6 — a category filter shows the reset button', () => {
        expect(
            shouldShowReset({
                ...DEFAULTS,
                categoryFilter: 'Listening Comprehension',
            }),
        ).toBe(true);
    });

    it('D6 — a non-default sort shows the reset button', () => {
        expect(
            shouldShowReset({ ...DEFAULTS, sortLabel: 'Points: High to Low' }),
        ).toBe(true);
    });

    it('D7 — all defaults hide the reset button', () => {
        expect(shouldShowReset(DEFAULTS)).toBe(false);
    });
});

describe('courseTable helper reuse — this page’s payload', () => {
    it('D8 — paginateCourses clamps the page live on the challenge list', () => {
        const { items, totalPages, safePage } = paginateCourses(
            CHALLENGES,
            9,
            2,
        );

        expect(safePage).toBe(2);
        expect(items.map((challenge) => challenge.id)).toEqual([3]);
        expect(totalPages).toBe(2);
    });

    it('D9 — a null category falls back to the Reading gradient (live-capable)', () => {
        // The payload ships category?->value — null when a
        // challenge carries no category.
        const theme = categoryThemeFor(null, CHALLENGE_CATEGORY_GRADIENTS);

        expect(theme.gradient).toBe(
            CHALLENGE_CATEGORY_GRADIENTS['Reading Comprehension'].gradient,
        );
    });

    it('D10 — a null category badges as Uncategorized', () => {
        expect(categoryBadgeFor(null)).toBe('Uncategorized');
    });

    it('D11 — the delete guard covers both ?. arms', () => {
        expect(hasDeletableId({ id: 9 })).toBe(true);
        expect(hasDeletableId(null)).toBe(false);
        expect(hasDeletableId({ title: 'Draft' })).toBe(false);
    });

    it('D12 — durations render in hours and minutes', () => {
        expect(formatDuration(15)).toBe('15m');
        expect(formatDuration(125)).toBe('2h 5m');
    });
});

describe('the delete flow — challengeTable helpers', () => {
    it('D13 — a deletable pending challenge resolves the destroy route URL', () => {
        // The route contract: dashboard.challenges.destroy
        // (DELETE /dashboard/challenges/{challenge}).
        expect(challengeDeleteUrl({ id: 9, title: 'Reading Sprint' })).toBe(
            '/dashboard/challenges/9',
        );
    });

    it('D13 — a null pending challenge resolves to no URL', () => {
        // The dialog only opens via startDelete with a full row,
        // so the guard's false arm is defensive — pinned as the
        // current contract rather than fixed (the unreachable
        // branch stays covered).
        expect(challengeDeleteUrl(null)).toBeNull();
    });

    it('D13 — an id-less draft resolves to no URL', () => {
        // hasDeletableId's false arm: a row without an id (the
        // family the guard exists for) can never fire a request.
        expect(challengeDeleteUrl({ title: 'Draft' })).toBeNull();
    });

    it('D14 — the dialog copy names the challenge and the consequence', () => {
        expect(challengeDeleteDescription({ title: 'Reading Sprint' })).toBe(
            'Are you sure you want to delete Reading Sprint? This action will permanently remove this challenge from the directory.',
        );
    });

    it('D14 — a null pending challenge computes the closed-state copy', () => {
        // The ?. arm — the string is computed on every render
        // before a delete starts, but the Radix portal is
        // unmounted while the dialog is closed, so it is never
        // displayed. Pinned as-is: the twin pages (users, courses)
        // compute the same shape.
        expect(challengeDeleteDescription(null)).toBe(
            'Are you sure you want to delete undefined? This action will permanently remove this challenge from the directory.',
        );
    });

    it('D15 — the post-delete pagination is the live clamp', () => {
        // The Users page needed an explicit pageAfterDelete helper
        // because its pagination does not clamp live; this page's
        // paginateCourses already does, so deleting the only item
        // on the last page falls the page back by construction.
        const remaining = CHALLENGES.filter((challenge) => challenge.id !== 3);

        const { safePage, items, totalPages } = paginateCourses(
            remaining,
            2,
            2,
        );

        expect(safePage).toBe(1);
        expect(items.map((challenge) => challenge.id)).toEqual([1, 2]);
        expect(totalPages).toBe(1);
    });
});
