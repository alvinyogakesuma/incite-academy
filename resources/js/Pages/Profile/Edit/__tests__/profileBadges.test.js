/**
 * Student profile badges tab tests.
 *
 * Covers the tab's showcase classification, its card styling, and
 * the displayed tally:
 *
 *  badgeShowcaseState
 *   D1  the three outcomes with the displayed-wins order — an
 *       equipped badge classifies displaying regardless of the
 *       awarded flag; awarded-but-undisplayed is earned; neither
 *       is locked
 *   D1  the implication probe — an unequipped-but-displayed
 *       payload shape is impossible (displaying implies earned),
 *       and the classification pins its behavior on that
 *       unreachable input as the counterpart of the avatar
 *       family's equipped-wins probe
 *
 *  badgeCardClasses
 *   D2  each state resolves its own class string from the map
 *
 *  equippedBadgeCount
 *   D3  the tally over none, some, and the all-displayed cap
 *       context
 *
 *  badgeToggleUrl (the toggle flow)
 *   D4  an earned badge resolves the toggle route URL in both
 *       display states (the no-equipped-guard contrast with the
 *       equip flow)
 *   D5  a locked badge resolves to no URL
 */
import { describe, it, expect } from 'vitest';
import {
    BADGE_CARD_CLASSES,
    badgeCardClasses,
    badgeShowcaseState,
    badgeToggleUrl,
    equippedBadgeCount,
} from '../profileBadges';

describe('badgeShowcaseState', () => {
    it('D1 — a displayed badge wins over an earned one', () => {
        expect(badgeShowcaseState({ isEquipped: true, isAwarded: true })).toBe(
            'displaying',
        );
    });

    it('D1 — an earned but undisplayed badge is earned', () => {
        expect(badgeShowcaseState({ isEquipped: false, isAwarded: true })).toBe(
            'earned',
        );
    });

    it('D1 — everything else is locked', () => {
        expect(
            badgeShowcaseState({ isEquipped: false, isAwarded: false }),
        ).toBe('locked');
    });

    it('D1 — the implication probe: a displayed-not-earned payload is impossible', () => {
        // Displaying implies earned (the equipped flag rides the
        // UserBadge row whose existence makes a badge awarded), so
        // an unequipped-but-displayed payload cannot occur; the
        // classification pins its behavior on that unreachable
        // input — the counterpart of the avatar family's
        // equipped-wins probe.
        expect(badgeShowcaseState({ isEquipped: true, isAwarded: false })).toBe(
            'displaying',
        );
    });
});

describe('badgeCardClasses', () => {
    it('D2 — each state resolves its own class string', () => {
        expect(badgeCardClasses({ isEquipped: true, isAwarded: true })).toBe(
            BADGE_CARD_CLASSES.displaying,
        );
        expect(badgeCardClasses({ isEquipped: false, isAwarded: true })).toBe(
            BADGE_CARD_CLASSES.earned,
        );
        expect(badgeCardClasses({ isEquipped: false, isAwarded: false })).toBe(
            BADGE_CARD_CLASSES.locked,
        );
    });
});

describe('equippedBadgeCount', () => {
    it('D3 — the tally over none, some, and the all-displayed cap context', () => {
        const [a, b, c] = [
            { isEquipped: true, isAwarded: true },
            { isEquipped: true, isAwarded: true },
            { isEquipped: true, isAwarded: true },
        ];

        expect(equippedBadgeCount([a, b, c])).toBe(3);
        expect(
            equippedBadgeCount(
                [a, b, c].map((badge) => ({ ...badge, isEquipped: false })),
            ),
        ).toBe(0);
        expect(equippedBadgeCount([a, b, { isEquipped: false }])).toBe(2);
    });
});

describe('badgeToggleUrl — the toggle flow', () => {
    it('D4 — an earned badge resolves the toggle route URL in both display states', () => {
        // The route contract: profile.badges.toggle
        // (POST /profile/badges/{badge}). The contrast with the
        // equip flow: the displayed badge rides the same URL
        // because the server un-displays it — no equipped no-op
        // arm exists.
        expect(
            badgeToggleUrl({ id: 9, isAwarded: true, isEquipped: false }),
        ).toBe('/profile/badges/9');
        expect(
            badgeToggleUrl({ id: 9, isAwarded: true, isEquipped: true }),
        ).toBe('/profile/badges/9');
    });

    it('D5 — a locked badge resolves to no URL', () => {
        // Locked badges are clickable; the guard is the only gate.
        expect(badgeToggleUrl({ id: 5, isAwarded: false })).toBeNull();
    });
});
