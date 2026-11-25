/**
 * Leaderboard tests.
 *
 * Covers the board's derivations and pins the reused homes on this
 * page's payload:
 *
 *  rankAccentText / rankTrophyClasses
 *   D1  the rank's accent — gold, silver, bronze, then plain, for
 *       both the number and the trophy
 *
 *  avatarBackgroundFor
 *   D2  the determinism contract — a stable color per name
 *   D3  the palette spread — real names land on their pinned
 *       classes
 *
 *  boardGapIndex
 *   D4  the window contract — the three arms: a short board, the
 *       literal next five, and the displaced neighborhood jump
 *
 *  Reuse pins (the profile info suite's covered homes)
 *   D5  initialsFor — the tenth duplicate eliminated (both pages'
 *       getInitials copies)
 *   D6  pointsLabel — the row chip rides the covered formatting
 */
import { describe, it, expect } from 'vitest';
import {
    avatarBackgroundFor,
    boardGapIndex,
    rankAccentText,
    rankTrophyClasses,
} from '../leaderboard';
import { initialsFor, pointsLabel } from '@/Pages/Profile/Edit/profileInfo';

describe('rankAccentText / rankTrophyClasses', () => {
    it('D1 — gold, silver, bronze, then plain for both accents', () => {
        expect(rankAccentText(1)).toBe('text-amber-500');
        expect(rankAccentText(2)).toBe('text-neutral-400');
        expect(rankAccentText(3)).toBe('text-amber-700');
        expect(rankAccentText(4)).toBe('text-neutral-400');
        expect(rankAccentText(17)).toBe('text-neutral-400');

        expect(rankTrophyClasses(1)).toBe('fill-amber-500/10 text-amber-500');
        expect(rankTrophyClasses(2)).toBe(
            'fill-neutral-400/10 text-neutral-400',
        );
        expect(rankTrophyClasses(3)).toBe('fill-amber-700/10 text-amber-700');
        expect(rankTrophyClasses(4)).toBe('text-neutral-300');
        expect(rankTrophyClasses(25)).toBe('text-neutral-300');
    });
});

describe('avatarBackgroundFor', () => {
    it('D2 — the color is stable per name (the determinism contract)', () => {
        expect(avatarBackgroundFor('Alvin Pratama')).toBe(
            avatarBackgroundFor('Alvin Pratama'),
        );
        expect(avatarBackgroundFor('Budi Santoso')).toBe(
            avatarBackgroundFor('Budi Santoso'),
        );
    });

    it('D3 — real names land on their pinned palette classes', () => {
        expect(avatarBackgroundFor('Alvin Pratama')).toBe(
            'bg-purple-50 text-purple-600 border-purple-100',
        );
        expect(avatarBackgroundFor('Budi Santoso')).toBe(
            'bg-sky-50 text-sky-600 border-sky-100',
        );
    });
});

describe('boardGapIndex — the window contract', () => {
    const row = (rank) => ({ rank });

    it('D4 — a board of five leaders or fewer carries no gap', () => {
        expect(boardGapIndex([row(1), row(2), row(3)])).toBeNull();
        expect(
            boardGapIndex([row(1), row(2), row(3), row(4), row(5)]),
        ).toBeNull();
    });

    it('D4 — the literal next five shows no gap (rank 6 sits at index 5)', () => {
        // The full ten: five leaders then the literal five.
        const literal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(row);

        expect(boardGapIndex(literal)).toBeNull();
    });

    it('D4 — a displaced neighborhood jumps the divider at index five', () => {
        // The visiting student ranked 11th: ranks 1-5, then 11
        // through 15 — the gap fires exactly at index five.
        const displaced = [1, 2, 3, 4, 5, 11, 12, 13, 14, 15].map(row);

        expect(boardGapIndex(displaced)).toBe(5);
    });
});

describe('reuse pins — the profile info homes', () => {
    it('D5 — the initials ride the covered derivation (the tenth duplicate eliminated)', () => {
        expect(initialsFor('Alvin Pratama')).toBe('AP');
        expect(initialsFor('Budi Santoso')).toBe('BS');
        expect(initialsFor('Maria')).toBe('M');
    });

    it('D6 — the row chip rides the covered formatting', () => {
        // The locale-dependent separator is pinned structurally.
        expect(pointsLabel(12000)).toMatch(/^12[.,]000$/);
        expect(pointsLabel(0)).toBe('0');
    });
});
