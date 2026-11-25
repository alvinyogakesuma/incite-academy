/**
 * Flatten the learning path form values into a multipart FormData
 * — the selected course ids as a flat array, files as-is, and
 * booleans as '1'/'0' so they always pass the server's boolean
 * rule.
 *
 * @param {Object} values zod-parsed form values.
 * @returns {FormData}
 */
export default function buildLearningPathFormData(values) {
    const data = new FormData();

    data.append('_method', 'put');
    data.append('title', values.title);
    data.append('description', values.description);
    data.append('level', values.level);

    if (values.image instanceof File) {
        data.append('image', values.image);
    }

    data.append('remove_image', values.remove_image ? '1' : '0');

    (values.courses ?? []).forEach((slot) => {
        data.append('courses[]', String(slot.course_id));
    });

    return data;
}

/**
 * The learning path form's initial values — the stored path
 * hydrated with null-safe fallbacks, or the blank defaults when
 * the editor opens fresh. The level falls back to the page's
 * first option / 'All Levels', and the stored course sequence
 * hydrates as one slot per course id. The `?.` guards are
 * defensive: the store flow seeds the row first, so the editor
 * always receives a learning path.
 *
 * @param {Object|null} learningPath
 * @param {string[]} levels
 */
export function initialLearningPathValues(learningPath, levels) {
    return {
        title: learningPath?.title ?? '',
        description: learningPath?.description ?? '',
        level: learningPath?.level ?? levels[0] ?? 'All Levels',
        image: null,
        remove_image: false,
        courses: (learningPath?.courses ?? []).map((course) => ({
            course_id: course.id,
        })),
    };
}
