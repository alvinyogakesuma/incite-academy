/**
 * Flatten the badge form values into a multipart FormData — the
 * condition rows in PHP bracket notation, files as-is, and
 * booleans as '1'/'0' so they always pass the server's boolean
 * rule.
 *
 * @param {Object} values zod-parsed form values.
 * @returns {FormData}
 */
export default function buildBadgeFormData(values) {
    const data = new FormData();

    data.append('_method', 'put');
    data.append('title', values.title);
    data.append('description', values.description);

    if (values.icon instanceof File) {
        data.append('icon', values.icon);
    }

    data.append('remove_icon', values.remove_icon ? '1' : '0');
    data.append('logic', values.logic);

    (values.conditions ?? []).forEach((condition, index) => {
        const prefix = `conditions[${index}]`;

        data.append(`${prefix}[type]`, condition.type);
        data.append(`${prefix}[operator]`, condition.operator);
        data.append(`${prefix}[value]`, condition.value);
    });

    return data;
}

/**
 * The badge form's initial values — the stored badge hydrated with
 * null-safe fallbacks, or the blank draft's defaults (the
 * draft-first create's visible state: the AND logic, no
 * conditions, no icon).
 *
 * @param {Object|null} badge
 */
export function initialBadgeValues(badge) {
    return {
        title: badge?.title ?? '',
        description: badge?.description ?? '',
        icon: null,
        remove_icon: false,
        logic: badge?.logic ?? 'AND',
        conditions: (badge?.conditions ?? []).map((condition) => ({
            type: condition.type ?? 'points',
            operator: condition.operator ?? '>=',
            value: condition.value ?? '',
        })),
    };
}
