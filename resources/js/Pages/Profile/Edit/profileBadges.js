/**
 * Student profile — the badge showcase tab's decisions.
 *
 * The tab keeps the grid wiring; this module owns the showcase
 * classification, the card's styling, and the displayed tally so
 * every outcome is unit testable:
 *
 *  - badgeShowcaseState  the three-way showcase classification —
 *                        a displayed badge wins, an earned-but-
 *                        undisplayed badge is earned, and
 *                        everything else is locked. The chip and
 *                        the card agree on every reachable payload
 *                        because displaying implies earned (the
 *                        equipped flag rides the UserBadge row
 *                        whose existence makes a badge awarded),
 *                        so the classification's order (equipped
 *                        first) and the card's original order
 *                        (awarded first) only differ on an
 *                        unreachable payload shape.
 *  - badgeCardClasses    the card's class string keyed on the
 *                        showcase state — the lookup's key is the
 *                        classification's own closed set, so no
 *                        fallback arm exists.
 *  - equippedBadgeCount  the displayed tally feeding the page's
 *                        count chip — the server guards the
 *                        showcase's maximum.
 *  - badgeToggleUrl     the toggle flow's guard-composed URL — an
 *                       earned badge resolves to the toggle route,
 *                       a locked badge to null. The contrast with
 *                       the equip flow's three-arm guard: there
 *                       the already-equipped pick resolves to the
 *                       no-op arm because the server's write is
 *                       idempotent, while here the displayed badge
 *                       rides the same URL — the server toggles it
 *                       off.
 */

export const BADGE_CARD_CLASSES = {
    displaying:
        'border-primary-700 bg-primary-50 ring-primary-700 cursor-pointer ring-1',
    earned: 'hover:border-primary-700/40 cursor-pointer border-neutral-950/5 bg-white shadow-sm hover:bg-neutral-50/80',
    locked: 'border-neutral-950/5 bg-neutral-50/50 opacity-60',
};

/**
 * The badge's showcase state — displaying, earned, or locked.
 */
export const badgeShowcaseState = (badge) => {
    if (badge.isEquipped) {
        return 'displaying';
    }

    if (badge.isAwarded) {
        return 'earned';
    }

    return 'locked';
};

/**
 * The card's class string for the badge's showcase state.
 */
export const badgeCardClasses = (badge) =>
    BADGE_CARD_CLASSES[badgeShowcaseState(badge)];

/**
 * The displayed badge tally behind the page's count chip.
 */
export const equippedBadgeCount = (badges) =>
    badges.filter((badge) => badge.isEquipped).length;

/**
 * The toggle flow's guard-composed URL.
 */
export const badgeToggleUrl = (badge) =>
    badge.isAwarded ? `/profile/badges/${badge.id}` : null;
