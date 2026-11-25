/**
 * The leaderboard's decisions.
 *
 * The board and its detail card keep the layout wiring; this
 * module owns the derivations so every outcome is unit testable:
 *
 *  - rankAccentText       the rank number's accent — gold, silver,
 *                         bronze, then plain.
 *  - rankTrophyClasses    the trophy icon's accent — the same
 *                         medals with their fill treatments.
 *  - avatarBackgroundFor  the decorative variety for initial
 *                         avatars — a stable color per name so rows
 *                         stay recognizable without an equipped
 *                         character (the deterministic hash pick;
 *                         the module behind both the board and the
 *                         detail card).
 *  - boardGapIndex        the jump to the visiting student's
 *                         neighborhood — the row where the divider
 *                         fills the board's gap: only when the
 *                         rankings grew past five leaders AND the
 *                         row at index five is already outside the
 *                         literal next five (its rank exceeds six,
 *                         the displaced window's first entry).
 */

export const rankAccentText = (rank) =>
    rank === 1
        ? 'text-amber-500'
        : rank === 2
          ? 'text-neutral-400'
          : rank === 3
            ? 'text-amber-700'
            : 'text-neutral-400';

export const rankTrophyClasses = (rank) =>
    rank === 1
        ? 'fill-amber-500/10 text-amber-500'
        : rank === 2
          ? 'fill-neutral-400/10 text-neutral-400'
          : rank === 3
            ? 'fill-amber-700/10 text-amber-700'
            : 'text-neutral-300';

const AVATAR_PALETTE = [
    'bg-indigo-50 text-indigo-600 border-indigo-100',
    'bg-emerald-50 text-emerald-600 border-emerald-100',
    'bg-rose-50 text-rose-600 border-rose-100',
    'bg-amber-50 text-amber-600 border-amber-100',
    'bg-purple-50 text-purple-600 border-purple-100',
    'bg-sky-50 text-sky-600 border-sky-100',
];

/**
 * The decorative variety for initial avatars — a stable color per
 * name.
 */
export const avatarBackgroundFor = (name) => {
    let hash = 0;

    for (let i = 0; i < name.length; i += 1) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

/**
 * The row where the board jumps to the visiting student's
 * neighborhood — the index the divider renders at, or null.
 */
export const boardGapIndex = (rankings) =>
    rankings.length > 5 && rankings[5].rank > 6 ? 5 : null;
