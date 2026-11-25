/**
 * Student lesson room — the article room's pure decisions.
 *
 * The room components keep the router dispatch and the Radix
 * accordion wiring; these helpers own the navigation and copy
 * decisions so every outcome is unit testable. The quiz and exam
 * rooms share the same layout, so they inherit this coverage:
 *
 *  - articleBodyFor      the lesson body — an empty or missing
 *                        article content shows the prepared-content
 *                        placeholder instead (the room's lesson
 *                        payload carries article_content raw and it
 *                        is nullable for unprepared lessons).
 *  - flatLessonsIn       the flat lesson list for navigation,
 *                        null-safe over missing sections and
 *                        missing lesson arrays.
 *  - activeLessonContext the active lesson's derived context — its
 *                        index, itself, and both navigation
 *                        boundaries. A lesson id that is not in the
 *                        outline (or an empty outline) resolves to
 *                        an inactive context.
 *  - previousLessonId    the id of the previous lesson, or null
 *                        on the first row.
 *  - nextVisitUrl        the Next button's destination — the next
 *                        lesson, or the course detail page when the
 *                        lesson is the last (the Finish Course arm).
 *  - roomTitleFor        the browser tab title, falling back to
 *                        'Lesson' when the active lesson is not in
 *                        the outline.
 *  - nextButtonLabel     'Next' for ordinary rows, 'Finish Course'
 *                        on the last.
 *  - reviewedLabel       'Reviewed' on completed rows, 'Mark as
 *                        Reviewed' otherwise.
 */
export const ARTICLE_PLACEHOLDER = `<p class="text-neutral-500 italic">This lesson's content is being prepared.</p>`;

/**
 * The article room's body — a lesson without content shows the
 * prepared-content placeholder.
 */
export const articleBodyFor = (lesson) =>
    lesson.article_content || ARTICLE_PLACEHOLDER;

/**
 * The flat lesson list for the Previous / Next navigation,
 * null-safe over missing sections and missing lesson arrays.
 */
export const flatLessonsIn = (sections) =>
    (sections || []).flatMap((section) => section.lessons || []);

/**
 * The active lesson's derived context — its index, itself, and
 * both navigation boundaries.
 *
 * DD-01 (fixed): the original expression computed hasNext as
 * `activeIndex < length - 1` alone, which is true for an unknown
 * lesson id (activeIndex -1) — an inactive context claiming a
 * next row. The inactive arm is now inert on both boundaries.
 */
export const activeLessonContext = (flatLessons, activeLessonId) => {
    const activeIndex = flatLessons.findIndex(
        (lesson) => lesson.id === activeLessonId,
    );
    const activeLesson = activeIndex >= 0 ? flatLessons[activeIndex] : null;

    return {
        activeIndex,
        activeLesson,
        hasPrevious: activeIndex > 0,
        hasNext: activeIndex >= 0 && activeIndex < flatLessons.length - 1,
    };
};

/**
 * The id of the previous lesson, or null on the first row.
 */
export const previousLessonId = (flatLessons, activeIndex) => {
    if (activeIndex > 0) {
        return flatLessons[activeIndex - 1].id;
    }

    return null;
};

/**
 * The Next button's destination — the next lesson's room, or the
 * course detail page when the lesson is the last.
 */
export const nextVisitUrl = (courseSlug, flatLessons, activeIndex) => {
    if (activeIndex < flatLessons.length - 1) {
        return `/courses/${courseSlug}/lessons/${flatLessons[activeIndex + 1].id}`;
    }

    return `/courses/${courseSlug}`;
};

/**
 * The browser tab title — 'Lesson' while the active lesson is not
 * in the outline.
 */
export const roomTitleFor = (activeLesson, courseTitle) =>
    `${activeLesson?.title || 'Lesson'} - ${courseTitle}`;

/**
 * The Next button's label.
 */
export const nextButtonLabel = (hasNext) =>
    hasNext ? 'Next' : 'Finish Course';

/**
 * The Mark as Reviewed button's label.
 */
export const reviewedLabel = (isCompleted) =>
    isCompleted ? 'Reviewed' : 'Mark as Reviewed';
