/**
 * Student profile — the character avatars tab's decisions.
 *
 * The tab keeps the grid wiring; this module owns the access
 * classification and the card's styling so every outcome is unit
 * testable:
 *
 *  - avatarAccessState  the three-way access classification — an
 *                       equipped avatar wins over an awarded one
 *                       (only one character is equipped at a
 *                       time, so the server clears the previous
 *                       pick), an awarded-but-unequipped avatar is
 *                       unlocked, and everything else is locked
 *                       behind its point threshold.
 *  - avatarCardClasses  the card's class string keyed on the
 *                       access state — the lookup's key is the
 *                       classification's own closed set, so no
 *                       fallback arm exists.
 *  - avatarEquipUrl     the equip flow's guard-composed URL — an
 *                       awarded, unequipped avatar resolves to the
 *                       equip route, while a locked card and the
 *                       already-equipped pick resolve to null, the
 *                       no-op arm. All three arms are live-capable:
 *                       locked and equipped cards are clickable,
 *                       and only this guard keeps the request from
 *                       firing (the server tolerates a redundant
 *                       equip — its clear-all-and-set is
 *                       idempotent).
 */

export const AVATAR_CARD_CLASSES = {
    equipped:
        'border-primary-700 bg-primary-50 ring-primary-700 cursor-pointer ring-1',
    unlocked:
        'hover:border-primary-700/40 cursor-pointer border-neutral-950/5 bg-white shadow-sm hover:bg-neutral-50/80',
    locked: 'border-neutral-950/5 bg-neutral-50/50',
};

/**
 * The avatar's access state — equipped, unlocked, or locked.
 */
export const avatarAccessState = (avatar) => {
    if (avatar.isEquipped) {
        return 'equipped';
    }

    if (avatar.isAwarded) {
        return 'unlocked';
    }

    return 'locked';
};

/**
 * The card's class string for the avatar's access state.
 */
export const avatarCardClasses = (avatar) =>
    AVATAR_CARD_CLASSES[avatarAccessState(avatar)];

/**
 * The equip flow's guard-composed URL.
 */
export const avatarEquipUrl = (avatar) =>
    avatar.isAwarded && !avatar.isEquipped
        ? `/profile/avatars/${avatar.id}`
        : null;
