/**
 * Learning path detail — the page's pure decisions.
 *
 * The component keeps the layout and router wiring; this module
 * owns the styling decisions so every outcome is unit testable:
 *
 *  - LEVEL_BADGE_COLORS    the level chip's style map — keyed to
 *                          every value of LearningPath::LEVELS.
 *  - levelBadgeFor         the level chip's style — an unknown or
 *                          missing level falls back to the
 *                          'All Levels' style. DD note: the
 *                          fallback is defensive-only, not
 *                          live-capable — the level column is a
 *                          NOT NULL enum shipped raw
 *                          ('level' => $learningPath->level),
 *                          the mirror opposite of the challenge
 *                          detail's difficulty, whose null is
 *                          live-capable (difficulty?->value).
 *  - enrollButtonState     the enrollment toggle's affordance —
 *                          the label and the variant classes.
 *                          DD note: the enrolled chip looks like
 *                          a status, but the same button posts
 *                          the toggle that drops the enrollment
 *                          (the backend's docblock: enrolling
 *                          creates the row, re-calling drops it)
 *                          — silent by design, documented here.
 */

export const LEVEL_BADGE_COLORS = {
    Beginner: 'border border-sky-200 bg-sky-100 text-sky-700',
    Intermediate: 'border border-purple-200 bg-purple-100 text-purple-700',
    Advanced: 'border border-rose-200 bg-rose-100 text-rose-700',
    'All Levels': 'border border-primary-700/20 bg-primary-50 text-primary-700',
};

/**
 * The level chip's style — unknown or missing levels fall back to
 * the 'All Levels' style.
 */
export const levelBadgeFor = (level) =>
    LEVEL_BADGE_COLORS[level] || LEVEL_BADGE_COLORS['All Levels'];

/**
 * The enrollment toggle's affordance — the enrolled state shows
 * the checked chip (the click still posts the toggle that drops
 * the row), the fresh state invites the enrollment.
 */
export const enrollButtonState = (isEnrolled) =>
    isEnrolled
        ? {
              label: '✓ Enrolled',
              variantClasses:
                  'bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600',
          }
        : {
              label: 'Enroll in Path',
              variantClasses:
                  'bg-primary-700 shadow-primary-700/10 text-white hover:opacity-90',
          };
