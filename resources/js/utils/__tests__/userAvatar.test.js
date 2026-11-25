/**
 * User avatar helper tests.
 *
 * Contract tests for the two helpers used by UserAvatar:
 *  D1  getInitials — two words → two initials
 *  D2  getInitials — one word → one initial
 *  D3  getInitials — 3+ words → only the first two
 *  D4  getInitials — lowercased to uppercased
 *  D5  getInitials — extra spaces contribute nothing
 *      (pinned quirk: 'John  Doe' → 'J', because the empty word from
 *      the double space consumes the second initial slot via slice)
 *  D6  getInitials — empty string → empty string
 *  D7  getAvatarStyles — deterministic for the same name
 *  D8  getAvatarStyles — always returns a palette class
 *  D9  getAvatarStyles — different names may map to different classes
 */
import { describe, it, expect } from 'vitest';
import {
    getInitials,
    getAvatarStyles,
    AVATAR_COLOR_CLASSES,
} from '@/utils/userAvatar';

describe('getInitials', () => {
    it('D1 — takes the first letters of the first two words', () => {
        expect(getInitials('Alvin Yoga')).toBe('AY');
        expect(getInitials('Budi Santoso')).toBe('BS');
    });

    it('D2 — a single word yields a single initial', () => {
        expect(getInitials('Alvin')).toBe('A');
    });

    it('D3 — three or more words only use the first two', () => {
        expect(getInitials('Alvin Yoga Kesuma')).toBe('AY');
    });

    it('D4 — lowercased names produce uppercased initials', () => {
        expect(getInitials('alvin yoga')).toBe('AY');
    });

    it('D5 — extra spaces contribute nothing (pinned quirk: the empty word consumes the second initial slot)', () => {
        // 'John  Doe'.split(' ') → ['John', '', 'Doe']; slice(0, 2) keeps
        // the empty word's undefined initial, so only 'J' survives join.
        // Pinned as-is: this is the current contract, not a bug fix.
        expect(getInitials('John  Doe')).toBe('J');
        expect(getInitials(' John')).toBe('J');
    });

    it('D6 — an empty name yields an empty string', () => {
        expect(getInitials('')).toBe('');
    });
});

describe('getAvatarStyles', () => {
    it('D7 — is deterministic for the same name', () => {
        expect(getAvatarStyles('Alvin Yoga')).toBe(
            getAvatarStyles('Alvin Yoga'),
        );
    });

    it('D8 — always returns one of the palette classes', () => {
        const names = [
            'Alvin Yoga',
            'Budi Santoso',
            'Citra Dewi',
            'Eka Putri',
            'Fajar Ramadhan',
            'Gita Savitri',
            'Hendra Wijaya',
            'Indah Permata',
        ];

        names.forEach((name) => {
            expect(AVATAR_COLOR_CLASSES).toContain(getAvatarStyles(name));
        });
    });

    it('D9 — names distribute across the palette', () => {
        const classes = new Set(
            ['Alvin Yoga', 'Budi Santoso', 'Citra Dewi'].map(getAvatarStyles),
        );

        expect(classes.size).toBeGreaterThan(1);
    });
});
