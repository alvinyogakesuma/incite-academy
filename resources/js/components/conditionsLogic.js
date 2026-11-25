/**
 * The earning-conditions builder's decisions — the module of the
 * shared ConditionsBuilder component (badges, avatars).
 *
 * The component keeps the field-array, dnd-kit, and Radix wiring;
 * this module owns the row decisions so every outcome is unit
 * testable:
 *
 *  - CONDITION_TYPE_LABELS      the types' humanized labels — the
 *                               single home for the chip maps (the
 *                               badges listing's and the row
 *                               summary's verbatim duplicates
 *                               eliminated).
 *  - conditionTypeLabel         the label lookup.
 *  - isNumericType              points and quiz earn through
 *                               numeric thresholds; course, path,
 *                               and challenge picks earn through a
 *                               specific entity, so their operator
 *                               locks to equality.
 *  - operatorAfterTypeSwitch    the type switch's pair reset — the
 *                               operator the new type starts on,
 *                               so a row never carries a
 *                               mismatched pair.
 *  - conditionSummary           the row's header chip — the
 *                               condition in one glance, with the
 *                               untyped placeholder and the
 *                               null-safe operator/value
 *                               fallbacks.
 *  - entityOptionsFor           the type's entity options chain.
 *  - entitySelectOptions        the empty-catalog fallback — an
 *                               entity pick with nothing available
 *                               still offers the stored value
 *                               (live-capable).
 *  - blankConditionRow          the Add Condition factory — a
 *                               points threshold starting '>=',
 *                               saving as-is.
 *  - conditionDeleteDescription the delete dialog's copy keyed to
 *                               the condition's position.
 */

export const CONDITION_TYPE_LABELS = {
    points: 'Points',
    quiz: 'Quiz',
    course: 'Course',
    path: 'Path',
    challenge: 'Challenge',
};

/**
 * The condition type's humanized label.
 */
export const conditionTypeLabel = (type) => CONDITION_TYPE_LABELS[type];

/**
 * Whether the condition type earns through a numeric threshold.
 */
export const isNumericType = (type) => type === 'points' || type === 'quiz';

/**
 * The operator a freshly switched type starts on.
 */
export const operatorAfterTypeSwitch = (type) =>
    isNumericType(type) ? '>=' : '=';

/**
 * The condition in one glance — the row's header chip.
 */
export const conditionSummary = (condition) => {
    if (!condition?.type) {
        return 'New Condition';
    }

    const typeLabel = CONDITION_TYPE_LABELS[condition.type] ?? condition.type;

    return `${typeLabel} ${condition.operator || ''} ${condition.value || '...'}`;
};

/**
 * The condition type's entity options chain.
 */
export const entityOptionsFor = (type, available) =>
    type === 'course'
        ? available.availableCourses
        : type === 'path'
          ? available.availablePaths
          : available.availableChallenges;

/**
 * The entity select's options — an empty catalog still offers the
 * stored value so the pick never blanks.
 */
export const entitySelectOptions = (options, currentValue) =>
    options.length > 0
        ? options
        : [
              {
                  value: currentValue ?? '',
                  label: currentValue ?? 'Nothing available yet...',
              },
          ];

/**
 * The Add Condition factory — a fresh row saves as-is.
 */
export const blankConditionRow = () => ({
    type: 'points',
    operator: '>=',
    value: '',
});

/**
 * The delete dialog's copy keyed to the condition's position.
 */
export const conditionDeleteDescription = (index) =>
    index !== null
        ? `Are you sure you want to delete Condition ${index + 1}? The item is saved with the condition removed.`
        : '';

/**
 * The meta item's pluralized condition count — one condition reads
 * singular, everything else plural.
 */
export const conditionsLabel = (count) =>
    `${count} ${count === 1 ? 'Condition' : 'Conditions'}`;
