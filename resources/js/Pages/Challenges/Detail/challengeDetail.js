/**
 * Challenge detail — the boarding screen's pure decisions.
 *
 * The component keeps the layout and router wiring; this module
 * owns the styling decisions so every outcome is unit testable:
 *
 *  - DIFFICULTY_STYLES      the difficulty tile's style map.
 *  - difficultyStyleFor     the difficulty tile's style — an
 *                           unknown or missing difficulty falls
 *                           back to the Easy style. DD note: the
 *                           fallback is live-capable, not merely
 *                           defensive — the show payload ships
 *                           `difficulty?->value`, which is null
 *                           when a challenge carries no
 *                           difficulty.
 *  - attemptPercentageColor the past-attempts percentage color —
 *                           strong results (>= 80%) read green,
 *                           everything else reads the brand
 *                           tone.
 */

export const DIFFICULTY_STYLES = {
    Easy: 'border border-emerald-100 bg-emerald-50 text-emerald-600',
    Medium: 'border border-amber-200 bg-amber-50 text-amber-600',
    Hard: 'border border-rose-200 bg-rose-50 text-rose-600',
};

/**
 * The difficulty tile's style — unknown or missing difficulties
 * fall back to the Easy style.
 */
export const difficultyStyleFor = (difficulty) =>
    DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.Easy;

/**
 * The past-attempts percentage color — strong results (>= 80%)
 * read green, everything else reads the brand tone.
 */
export const attemptPercentageColor = (percentage) =>
    percentage >= 80 ? 'text-emerald-600' : 'text-primary-700';
