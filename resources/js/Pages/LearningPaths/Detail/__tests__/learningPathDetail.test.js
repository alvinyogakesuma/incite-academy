/**
 * Learning path detail tests.
 *
 * Covers the page's own decisions in learningPathDetail.js and
 * pins the reuse on this page's payload:
 *
 *  levelBadgeFor
 *   D1  every LearningPath::LEVELS value resolves its own style
 *   D2  an unknown or missing level falls back to the
 *       'All Levels' style — defensive-only: the column is a
 *       NOT NULL enum shipped raw (the mirror of the challenge
 *       detail's live-capable null difficulty)
 *
 *  enrollButtonState
 *   D3  a fresh state shows the enroll invitation with the
 *       primary variant
 *   D4  the enrolled state shows the checked chip with the
 *       emerald variant — the click still posts the toggle that
 *       drops the enrollment (silent by design, documented)
 *
 *  Reuse pins and contracts
 *   D5  the style map stays synced with LearningPath::LEVELS —
 *       the sync is what keeps the fallback unreachable
 *   D6  formatDuration — the sixth verbatim duplicate eliminated
 *       (the page's copy deleted; the covered courseTable home)
 *   D7  formatDuration renders the course rows' and the
 *       sidebar's int-cast durations
 */
import { describe, it, expect } from 'vitest';
import {
    LEVEL_BADGE_COLORS,
    enrollButtonState,
    levelBadgeFor,
} from '../learningPathDetail';
import { formatDuration } from '@/Pages/Dashboard/Courses/courseTable';

describe('levelBadgeFor', () => {
    it('D1 — every LEVELS value resolves its own style', () => {
        for (const [level, style] of Object.entries(LEVEL_BADGE_COLORS)) {
            expect(levelBadgeFor(level)).toBe(style);
        }
    });

    it('D2 — an unknown or missing level falls back defensively', () => {
        expect(levelBadgeFor('Quantum Level')).toBe(
            LEVEL_BADGE_COLORS['All Levels'],
        );
        expect(levelBadgeFor(null)).toBe(LEVEL_BADGE_COLORS['All Levels']);
    });
});

describe('enrollButtonState', () => {
    it('D3 — a fresh state invites the enrollment with the primary variant', () => {
        expect(enrollButtonState(false)).toEqual({
            label: 'Enroll in Path',
            variantClasses:
                'bg-primary-700 shadow-primary-700/10 text-white hover:opacity-90',
        });
    });

    it('D4 — the enrolled state shows the checked chip (the click still toggles)', () => {
        expect(enrollButtonState(true)).toEqual({
            label: '✓ Enrolled',
            variantClasses:
                'bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600',
        });
    });
});

describe('reuse pins and contracts', () => {
    it('D5 — the style map stays synced with LearningPath::LEVELS', () => {
        // The backend const: ['Beginner', 'Intermediate',
        // 'Advanced', 'All Levels'] — every key present is what
        // keeps the fallback unreachable.
        expect(Object.keys(LEVEL_BADGE_COLORS)).toEqual([
            'Beginner',
            'Intermediate',
            'Advanced',
            'All Levels',
        ]);
    });

    it('D6 — durations render in hours and minutes', () => {
        expect(formatDuration(15)).toBe('15m');
        expect(formatDuration(125)).toBe('2h 5m');
    });

    it('D7 — the page\u2019s int-cast payloads render their durations', () => {
        // The course rows (duration) and the sidebar
        // (learningPath.duration) ride the payload's int casts.
        expect(formatDuration(0)).toBe('0m');
        expect(formatDuration(480)).toBe('8h 0m');
        expect(formatDuration(720)).toBe('12h 0m');
    });
});
