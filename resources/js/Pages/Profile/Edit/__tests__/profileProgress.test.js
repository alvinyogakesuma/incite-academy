/**
 * Student profile course progress tab tests.
 *
 * Covers the tab's one decision — the category chip's lookup —
 * with its live-capable fallback, straight from the payload's
 * nullable category:
 *
 *  courseCategoryChipClasses
 *   D1  each known category resolves its own outlined pair
 *   D2  a null category falls back live (the empty-chip contract:
 *       the chip renders with the default style and no label)
 *   D3  an unknown category falls back defensively
 *
 *  pathStatusChip
 *   D4  progress reads Active with the primary variant; the
 *       freshly-enrolled zero reads Enrolled (the live arm)
 *
 *  levelBadgeFor (reuse pin — the shared lookup from the learning
 *  path detail's covered module)
 *   D5  the level chip rides the shared map; its defensive
 *       fallback re-stated on this page's payload
 */
import { describe, it, expect } from 'vitest';
import {
    COURSE_CATEGORY_STYLES,
    DEFAULT_CATEGORY_STYLE,
    courseCategoryChipClasses,
    pathStatusChip,
} from '../profileProgress';
import {
    LEVEL_BADGE_COLORS,
    levelBadgeFor,
} from '@/Pages/LearningPaths/Detail/learningPathDetail';

describe('courseCategoryChipClasses', () => {
    it('D1 — each known category resolves its own outlined pair', () => {
        for (const [category, style] of Object.entries(
            COURSE_CATEGORY_STYLES,
        )) {
            expect(courseCategoryChipClasses(category)).toBe(style);
        }
    });

    it('D2 — a null category falls back live', () => {
        // The payload ships category?->value, nullable, so the
        // fallback arm is genuinely reachable: the chip renders
        // with the default style and an empty label.
        expect(courseCategoryChipClasses(null)).toBe(DEFAULT_CATEGORY_STYLE);
    });

    it('D3 — an unknown category falls back defensively', () => {
        expect(courseCategoryChipClasses('Quantum Computing')).toBe(
            DEFAULT_CATEGORY_STYLE,
        );
    });
});

describe('pathStatusChip', () => {
    it('D4 — progress reads Active with the primary variant', () => {
        expect(pathStatusChip(45)).toEqual({
            label: 'Active',
            classes: 'border-primary-700/5 bg-primary-50 text-primary-700',
        });
    });

    it('D4 — a freshly enrolled path reads Enrolled (the live zero arm)', () => {
        // Backend-computed 0: a path with no lessons or none
        // completed.
        expect(pathStatusChip(0)).toEqual({
            label: 'Enrolled',
            classes: 'border-neutral-200 bg-neutral-100 text-neutral-600',
        });
    });
});

describe('levelBadgeFor — the reuse pin', () => {
    it('D5 — the level chip rides the shared lookup', () => {
        // The tab's verbatim duplicate of the learning path
        // detail's covered palette is eliminated; the shared
        // lookup covers this page's payload.
        expect(levelBadgeFor('Beginner')).toBe(LEVEL_BADGE_COLORS.Beginner);
        expect(levelBadgeFor('All Levels')).toBe(
            LEVEL_BADGE_COLORS['All Levels'],
        );
        // Defensive: the level is a NOT NULL enum.
        expect(levelBadgeFor(null)).toBe(LEVEL_BADGE_COLORS['All Levels']);
    });
});
