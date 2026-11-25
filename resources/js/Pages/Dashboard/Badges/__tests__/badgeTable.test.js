/**
 * Badges management table tests.
 *
 * Covers the page-specific decisions in badgeTable.js — the
 * search-only pipeline, the condition chip, the pluralization, and
 * the delete flow — and pins the courseTable reuse:
 *
 *  filterBadges
 *   D1  search guard              (empty query → all / query → filter)
 *   D2  searchable fields         (title / description / no match)
 *   D3  null-safe fields          (the split: title defensive — NOT
 *                                 NULL and drafts seed it; description
 *                                 live — a nullable column)
 *
 *  conditionsLabel / conditionLabelFor
 *   D4  the pluralization         (one condition reads singular,
 *                                 everything else plural)
 *   D5  the chip's known types    (the five humanized labels)
 *   D6  the live null arm         (a condition-less badge — a fresh
 *                                 draft — yields undefined, so the
 *                                 card renders no chip at all)
 *
 *  paginateCourses (reuse)
 *   D7  the live clamp on this page's data
 *
 *  The delete flow (badgeTable helpers)
 *   D8  the guard-composed URL    (the destroy route pinned
 *                                 literally; null and id-less rows
 *                                 resolve to no URL)
 *   D9  the dialog copy           (titled arm and the null
 *                                 closed-state arm)
 *   D10 the post-delete pagination (the live clamp handles the
 *                                  shrunken list)
 */
import { describe, it, expect } from 'vitest';
import {
    BADGE_GRADIENT,
    CONDITION_LABELS,
    badgeDeleteDescription,
    badgeDeleteUrl,
    conditionsLabel,
    conditionLabelFor,
    filterBadges,
} from '../badgeTable';
import { paginateCourses } from '@/Pages/Dashboard/Courses/courseTable';

/** Mirrors the Admin BadgeController::index map shape. */
const BADGES = [
    {
        id: 1,
        title: 'First Steps',
        description: 'Complete your first article lesson',
        icon_url: '/storage/badges/first-steps.png',
        conditions_count: 1,
        condition_type: 'points',
        recipients_count: 12,
    },
    {
        id: 2,
        title: 'Quiz Master',
        description: 'Score perfect on three quizzes',
        icon_url: null,
        conditions_count: 3,
        condition_type: 'quiz',
        recipients_count: 4,
    },
    {
        id: 3,
        title: 'Path Pioneer',
        description: 'Finish a learning path',
        icon_url: null,
        conditions_count: 2,
        condition_type: 'path',
        recipients_count: 1,
    },
];

const NO_FILTERS = { query: '' };

describe('filterBadges', () => {
    it('D1 — an empty query returns every badge', () => {
        expect(filterBadges(BADGES, NO_FILTERS)).toHaveLength(3);
    });

    it('D2 — matches on title', () => {
        const result = filterBadges(BADGES, { ...NO_FILTERS, query: 'master' });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D2 — matches on description', () => {
        const result = filterBadges(BADGES, {
            ...NO_FILTERS,
            query: 'learning path',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('D2 — drops badges that match no field', () => {
        expect(
            filterBadges(BADGES, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
    });

    it('D3 — a null description is reached safely when the title misses', () => {
        // Description is nullable in the migration — the guard's
        // fallback is genuinely reachable.
        const withNullDesc = [
            ...BADGES,
            {
                id: 4,
                title: 'Mock Badge',
                description: null,
                icon_url: null,
                conditions_count: 1,
                condition_type: 'course',
                recipients_count: 0,
            },
        ];

        expect(
            filterBadges(withNullDesc, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
        expect(
            filterBadges(withNullDesc, { ...NO_FILTERS, query: 'mock' }),
        ).toHaveLength(1);
    });

    it('D3 — a null title is reached safely when the description matches (defensive)', () => {
        // Title is NOT NULL and drafts seed it 'Untitled Badge' —
        // the guard is purely defensive, pinned as the contract.
        const withNullTitle = [
            {
                id: 5,
                title: null,
                description: 'A draft badge description',
                icon_url: null,
                conditions_count: 0,
                condition_type: null,
                recipients_count: 0,
            },
        ];

        expect(
            filterBadges(withNullTitle, { ...NO_FILTERS, query: 'draft' }),
        ).toHaveLength(1);
        expect(
            filterBadges(withNullTitle, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
    });
});

describe('conditionsLabel / conditionLabelFor', () => {
    it('D4 — one condition reads singular; everything else plural', () => {
        expect(conditionsLabel(1)).toBe('1 Condition');
        expect(conditionsLabel(0)).toBe('0 Conditions');
        expect(conditionsLabel(3)).toBe('3 Conditions');
    });

    it('D5 — the five known types humanize', () => {
        expect(conditionLabelFor('points')).toBe('Points');
        expect(conditionLabelFor('quiz')).toBe('Quiz');
        expect(conditionLabelFor('course')).toBe('Course');
        expect(conditionLabelFor('path')).toBe('Path');
        expect(conditionLabelFor('challenge')).toBe('Challenge');
    });

    it('D6 — a condition-less badge yields undefined, so no chip renders', () => {
        // Live-capable: a fresh draft ships conditions_count 0 and
        // condition_type null, and the card's badgeText guard
        // renders no chip for the undefined.
        expect(CONDITION_LABELS.points).toBe('Points');
        expect(conditionLabelFor(null)).toBeUndefined();
        expect(conditionLabelFor('unknown-type')).toBeUndefined();
    });
});

describe('paginateCourses (reuse pin)', () => {
    it('D7 — the live clamp on the badge list', () => {
        const { items, totalPages, safePage } = paginateCourses(BADGES, 9, 2);

        expect(safePage).toBe(2);
        expect(items.map((badge) => badge.id)).toEqual([3]);
        expect(totalPages).toBe(2);
    });
});

describe('the delete flow — badgeTable helpers', () => {
    it('D8 — a deletable pending badge resolves the destroy route URL', () => {
        // The route contract: dashboard.badges.destroy
        // (DELETE /dashboard/badges/{badge}).
        expect(badgeDeleteUrl({ id: 9, title: 'First Steps' })).toBe(
            '/dashboard/badges/9',
        );
    });

    it('D8 — a null pending badge resolves to no URL', () => {
        // The dialog only opens via startDelete with a full row,
        // so the guard's false arm is defensive — pinned as the
        // current contract.
        expect(badgeDeleteUrl(null)).toBeNull();
    });

    it('D8 — an id-less row resolves to no URL', () => {
        expect(badgeDeleteUrl({ title: 'Draft' })).toBeNull();
    });

    it('D9 — the dialog copy names the badge and the consequence', () => {
        expect(badgeDeleteDescription({ title: 'First Steps' })).toBe(
            'Are you sure you want to delete First Steps? This will permanently remove this achievement badge.',
        );
    });

    it('D9 — a null pending badge computes the closed-state copy', () => {
        // The ?. arm — the string is computed on every render
        // before a delete starts, but the Radix portal is
        // unmounted while the dialog is closed, so it is never
        // displayed. Pinned as-is.
        expect(badgeDeleteDescription(null)).toBe(
            'Are you sure you want to delete undefined? This will permanently remove this achievement badge.',
        );
    });

    it('D10 — the post-delete pagination is the live clamp', () => {
        const remaining = BADGES.filter((badge) => badge.id !== 3);

        const { safePage, items, totalPages } = paginateCourses(
            remaining,
            2,
            2,
        );

        expect(safePage).toBe(1);
        expect(items.map((badge) => badge.id)).toEqual([1, 2]);
        expect(totalPages).toBe(1);
    });
});

describe('BADGE_GRADIENT', () => {
    it('the family gold cover ships', () => {
        expect(BADGE_GRADIENT).toBe(
            'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
        );
    });
});
