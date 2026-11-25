/**
 * Challenge detail tests.
 *
 * Covers every decision in challengeDetail.js:
 *
 *  difficultyStyleFor
 *   D1  Easy / Medium / Hard resolve to their own styles
 *   D2  unknown and missing difficulties fall back to the Easy
 *       style (DD note: the fallback is live-capable — the show
 *       payload ships difficulty?->value, which is null when a
 *       challenge carries no difficulty)
 *
 *  attemptPercentageColor
 *   D3  the 80% threshold — exactly 80 is green, 79 is not
 *   D4  the extremes — 100 green, 0 brand tone
 */
import { describe, it, expect } from 'vitest';
import {
    DIFFICULTY_STYLES,
    attemptPercentageColor,
    difficultyStyleFor,
} from '../challengeDetail';

describe('difficultyStyleFor', () => {
    it('D1 — Easy, Medium, and Hard resolve to their own styles', () => {
        expect(difficultyStyleFor('Easy')).toBe(DIFFICULTY_STYLES.Easy);
        expect(difficultyStyleFor('Medium')).toBe(DIFFICULTY_STYLES.Medium);
        expect(difficultyStyleFor('Hard')).toBe(DIFFICULTY_STYLES.Hard);
    });

    it('D2 — an unknown difficulty falls back to the Easy style', () => {
        expect(difficultyStyleFor('Expert')).toBe(DIFFICULTY_STYLES.Easy);
        expect(difficultyStyleFor('bogus')).toBe(DIFFICULTY_STYLES.Easy);
    });

    it('D2 — a null difficulty falls back to the Easy style', () => {
        // The show payload ships difficulty?->value — null when a
        // challenge carries no difficulty, so this arm is
        // live-capable, not merely defensive.
        expect(difficultyStyleFor(null)).toBe(DIFFICULTY_STYLES.Easy);
        expect(difficultyStyleFor(undefined)).toBe(DIFFICULTY_STYLES.Easy);
    });
});

describe('attemptPercentageColor', () => {
    it('D3 — exactly 80% reads green; 79% does not', () => {
        expect(attemptPercentageColor(80)).toBe('text-emerald-600');
        expect(attemptPercentageColor(79)).toBe('text-primary-700');
    });

    it('D4 — the extremes resolve correctly', () => {
        expect(attemptPercentageColor(100)).toBe('text-emerald-600');
        expect(attemptPercentageColor(0)).toBe('text-primary-700');
    });
});
