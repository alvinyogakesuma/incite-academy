/**
 * Student profile avatars tab tests.
 *
 * Covers the tab's access classification and its card styling, and
 * pins the points chip's reuse:
 *
 *  avatarAccessState
 *   D1  the three outcomes with the equipped-wins precedence —
 *       an equipped avatar classifies equipped regardless of the
 *       awarded flag; awarded-but-unequipped is unlocked; neither
 *       is locked
 *
 *  avatarCardClasses
 *   D2  each state resolves its own class string from the map
 *
 *  Reuse pin
 *   D3  the points chip rides the personal info suite's covered
 *       formatting — the duplicate eliminated
 *
 *  avatarEquipUrl (the equip flow)
 *   D4  an awarded, unequipped avatar resolves the equip route URL
 *   D5  a locked avatar resolves to no URL
 *   D6  the already-equipped pick resolves to no URL
 */
import { describe, it, expect } from 'vitest';
import {
    AVATAR_CARD_CLASSES,
    avatarAccessState,
    avatarCardClasses,
    avatarEquipUrl,
} from '../profileAvatars';
import { pointsLabel } from '../profileInfo';

describe('avatarAccessState', () => {
    it('D1 — an equipped avatar wins over an awarded one', () => {
        // Only one character is equipped at a time, so the
        // equipped flag owns the classification.
        expect(avatarAccessState({ isEquipped: true, isAwarded: true })).toBe(
            'equipped',
        );
    });

    it('D1 — an awarded but unequipped avatar is unlocked', () => {
        expect(avatarAccessState({ isEquipped: false, isAwarded: true })).toBe(
            'unlocked',
        );
    });

    it('D1 — everything else is locked', () => {
        expect(avatarAccessState({ isEquipped: false, isAwarded: false })).toBe(
            'locked',
        );
    });
});

describe('avatarCardClasses', () => {
    it('D2 — each state resolves its own class string', () => {
        expect(avatarCardClasses({ isEquipped: true, isAwarded: false })).toBe(
            AVATAR_CARD_CLASSES.equipped,
        );
        expect(avatarCardClasses({ isEquipped: false, isAwarded: true })).toBe(
            AVATAR_CARD_CLASSES.unlocked,
        );
        expect(avatarCardClasses({ isEquipped: false, isAwarded: false })).toBe(
            AVATAR_CARD_CLASSES.locked,
        );
    });
});

describe('reuse pin', () => {
    it('D3 — the points chip rides the covered formatting', () => {
        // The tab's chip duplicated the personal info header's
        // formatting; both now share the covered helper.
        expect(pointsLabel(12000)).toMatch(/^12[.,]000$/);
        expect(pointsLabel(null)).toBe('0');
    });
});

describe('avatarEquipUrl — the equip flow', () => {
    it('D4 — an awarded, unequipped avatar resolves the equip route URL', () => {
        // The route contract: profile.avatars.equip
        // (POST /profile/avatars/{avatar}).
        expect(
            avatarEquipUrl({ id: 9, isAwarded: true, isEquipped: false }),
        ).toBe('/profile/avatars/9');
    });

    it('D5 — a locked avatar resolves to no URL', () => {
        // Locked cards are clickable; the guard is the only gate
        // keeping the request from firing.
        expect(
            avatarEquipUrl({ id: 5, isAwarded: false, isEquipped: false }),
        ).toBeNull();
    });

    it('D6 — the already-equipped pick resolves to no URL', () => {
        // The server's clear-all-and-set is idempotent, so this
        // guard is the only thing preventing the redundant round
        // trip.
        expect(
            avatarEquipUrl({ id: 9, isAwarded: true, isEquipped: true }),
        ).toBeNull();
    });
});
