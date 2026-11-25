/**
 * Avatars management table tests.
 *
 * Covers the page-specific decisions in avatarTable.js — the
 * search-only pipeline and the delete flow — and pins the reused
 * homes on this page's payload:
 *
 *  filterAvatars
 *   D1  search guard              (empty query → all / query → filter)
 *   D2  searchable fields         (title / description / no match)
 *   D3  null-safe fields          (the split: title defensive — NOT
 *                                 NULL and drafts seed it; description
 *                                 live — a nullable column)
 *
 *  conditionTypeLabel / conditionsLabel (the conditions module's
 *  single home, serving this listing)
 *   D4  the chip's known types    (the five humanized labels)
 *   D5  the live undefined arm    (a condition-less avatar — a fresh
 *                                 draft — yields undefined, so the
 *                                 card renders no chip at all)
 *   D6  the pluralization         (one condition reads singular,
 *                                 everything else plural — pinned on
 *                                 its consolidated home)
 *
 *  paginateCourses (reuse)
 *   D7  the live clamp on this page's data
 *
 *  The delete flow (avatarTable helpers)
 *   D8  the guard-composed URL    (the destroy route pinned
 *                                 literally; null and id-less rows
 *                                 resolve to no URL)
 *   D9  the dialog copy           (titled arm and the null
 *                                 closed-state arm)
 *   D10 the post-delete pagination (the live clamp handles the
 *                                  shrunken list)
 *
 *  AVATAR_GRADIENT
 *   D11 the family violet cover ships
 */
import { describe, it, expect } from 'vitest';
import {
    AVATAR_GRADIENT,
    avatarDeleteDescription,
    avatarDeleteUrl,
    filterAvatars,
} from '../avatarTable';
import { paginateCourses } from '@/Pages/Dashboard/Courses/courseTable';
import {
    conditionTypeLabel,
    conditionsLabel,
} from '@/components/conditionsLogic';

/** Mirrors the Admin AvatarController::index map shape. */
const AVATARS = [
    {
        id: 1,
        title: 'Scholar Owl',
        description: 'Earn your first 500 points',
        icon_url: '/storage/avatars/owl.png',
        conditions_count: 1,
        condition_type: 'points',
        recipients_count: 42,
    },
    {
        id: 2,
        title: 'Night Scholar',
        description: 'Complete five courses',
        icon_url: null,
        conditions_count: 2,
        condition_type: 'course',
        recipients_count: 9,
    },
    {
        id: 3,
        title: 'Golden Quill',
        description: 'Conquer a challenge gauntlet',
        icon_url: null,
        conditions_count: 3,
        condition_type: 'challenge',
        recipients_count: 2,
    },
];

const NO_FILTERS = { query: '' };

describe('filterAvatars', () => {
    it('D1 — an empty query returns every avatar', () => {
        expect(filterAvatars(AVATARS, NO_FILTERS)).toHaveLength(3);
    });

    it('D2 — matches on title', () => {
        const result = filterAvatars(AVATARS, { ...NO_FILTERS, query: 'owl' });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('D2 — matches on description', () => {
        const result = filterAvatars(AVATARS, {
            ...NO_FILTERS,
            query: 'gauntlet',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('D2 — drops avatars that match no field', () => {
        expect(
            filterAvatars(AVATARS, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
    });

    it('D3 — a null description is reached safely when the title misses', () => {
        // Description is nullable in the migration — the guard's
        // fallback is genuinely reachable.
        const withNullDesc = [
            ...AVATARS,
            {
                id: 4,
                title: 'Mock Avatar',
                description: null,
                icon_url: null,
                conditions_count: 1,
                condition_type: 'points',
                recipients_count: 0,
            },
        ];

        expect(
            filterAvatars(withNullDesc, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
        expect(
            filterAvatars(withNullDesc, { ...NO_FILTERS, query: 'mock' }),
        ).toHaveLength(1);
    });

    it('D3 — a null title is reached safely when the description matches (defensive)', () => {
        // Title is NOT NULL and drafts seed it 'Untitled Avatar' —
        // the guard is purely defensive, pinned as the contract.
        const withNullTitle = [
            {
                id: 5,
                title: null,
                description: 'A draft avatar description',
                icon_url: null,
                conditions_count: 0,
                condition_type: null,
                recipients_count: 0,
            },
        ];

        expect(
            filterAvatars(withNullTitle, { ...NO_FILTERS, query: 'draft' }),
        ).toHaveLength(1);
        expect(
            filterAvatars(withNullTitle, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
    });
});

describe('conditionTypeLabel / conditionsLabel — the single home', () => {
    it('D4 — the five known types humanize', () => {
        expect(conditionTypeLabel('points')).toBe('Points');
        expect(conditionTypeLabel('quiz')).toBe('Quiz');
        expect(conditionTypeLabel('course')).toBe('Course');
        expect(conditionTypeLabel('path')).toBe('Path');
        expect(conditionTypeLabel('challenge')).toBe('Challenge');
    });

    it('D5 — a condition-less avatar yields undefined, so no chip renders', () => {
        // Live-capable: a fresh draft ships conditions_count 0 and
        // condition_type null, and the card's badgeText guard
        // renders no chip for the undefined. The raw lookup
        // carries no passthrough.
        expect(conditionTypeLabel(null)).toBeUndefined();
    });

    it('D6 — one condition reads singular; everything else plural', () => {
        expect(conditionsLabel(1)).toBe('1 Condition');
        expect(conditionsLabel(0)).toBe('0 Conditions');
        expect(conditionsLabel(3)).toBe('3 Conditions');
    });
});

describe('paginateCourses (reuse pin)', () => {
    it('D7 — the live clamp on the avatar list', () => {
        const { items, totalPages, safePage } = paginateCourses(AVATARS, 9, 2);

        expect(safePage).toBe(2);
        expect(items.map((avatar) => avatar.id)).toEqual([3]);
        expect(totalPages).toBe(2);
    });
});

describe('the delete flow — avatarTable helpers', () => {
    it('D8 — a deletable pending avatar resolves the destroy route URL', () => {
        // The route contract: dashboard.avatars.destroy
        // (DELETE /dashboard/avatars/{avatar}).
        expect(avatarDeleteUrl({ id: 9, title: 'Scholar Owl' })).toBe(
            '/dashboard/avatars/9',
        );
    });

    it('D8 — a null pending avatar resolves to no URL', () => {
        // The dialog only opens via startDelete with a full row,
        // so the guard's false arm is defensive — pinned as the
        // current contract.
        expect(avatarDeleteUrl(null)).toBeNull();
    });

    it('D8 — an id-less row resolves to no URL', () => {
        expect(avatarDeleteUrl({ title: 'Draft' })).toBeNull();
    });

    it('D9 — the dialog copy names the avatar and the consequence', () => {
        expect(avatarDeleteDescription({ title: 'Scholar Owl' })).toBe(
            'Are you sure you want to delete Scholar Owl? This will permanently remove this character avatar.',
        );
    });

    it('D9 — a null pending avatar computes the closed-state copy', () => {
        // The ?. arm — the string is computed on every render
        // before a delete starts, but the Radix portal is
        // unmounted while the dialog is closed, so it is never
        // displayed. Pinned as-is.
        expect(avatarDeleteDescription(null)).toBe(
            'Are you sure you want to delete undefined? This will permanently remove this character avatar.',
        );
    });

    it('D10 — the post-delete pagination is the live clamp', () => {
        const remaining = AVATARS.filter((avatar) => avatar.id !== 3);

        const { safePage, items, totalPages } = paginateCourses(
            remaining,
            2,
            2,
        );

        expect(safePage).toBe(1);
        expect(items.map((avatar) => avatar.id)).toEqual([1, 2]);
        expect(totalPages).toBe(1);
    });
});

describe('AVATAR_GRADIENT', () => {
    it('D11 — the family violet cover ships', () => {
        expect(AVATAR_GRADIENT).toBe(
            'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        );
    });
});
