/**
 * Student profile — the progress tabs' decisions.
 *
 * The tabs keep their grids and Radix meters as wiring; this
 * module owns the chip lookups so every outcome is unit testable:
 *
 *  - courseCategoryChipClasses  the course progress chip's style —
 *                               a known category's outlined pair,
 *                               anything else the page's default.
 *                               The fallback is live-capable: the
 *                               payload ships category?->value,
 *                               nullable, so a course without a
 *                               category renders an empty chip
 *                               wearing the default style.
 */

export const COURSE_CATEGORY_STYLES = {
    'Reading Comprehension':
        'border border-indigo-200 bg-indigo-100 text-indigo-700',
    'Listening Comprehension': 'border border-sky-200 bg-sky-100 text-sky-700',
    'Structure and Writing Expression':
        'border border-rose-200 bg-rose-100 text-rose-700',
};

export const DEFAULT_CATEGORY_STYLE =
    'border border-primary-700/20 bg-primary-50 text-primary-700';

/**
 * The course progress chip's class string for the category.
 */
export const courseCategoryChipClasses = (category) =>
    COURSE_CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;

/**
 * The paths tab's status chip — a path with any progress reads
 * Active; a freshly enrolled one (backend-computed 0) reads
 * Enrolled.
 */
export const pathStatusChip = (progress) =>
    progress > 0
        ? {
              label: 'Active',
              classes: 'border-primary-700/5 bg-primary-50 text-primary-700',
          }
        : {
              label: 'Enrolled',
              classes: 'border-neutral-200 bg-neutral-100 text-neutral-600',
          };
