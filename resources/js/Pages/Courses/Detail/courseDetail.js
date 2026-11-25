/**
 * Course detail page — the student course room's pure decisions.
 *
 * The page and its outline accordion keep the react-hook-form and
 * Radix wiring; these helpers own the derivations so every outcome
 * is unit testable:
 *
 *  - progressSummaryFor  the completed-lesson tally and the
 *                        per-type progress bars (articles, quizzes,
 *                        exams), null-safe over missing sections
 *                        and missing lesson arrays.
 *  - lessonIconTag      the lesson row's icon dispatch — completed
 *                        rows show the check, quizzes the pencil,
 *                        exams the hourglass, everything else the
 *                        article glyph.
 *                        DD note: the 'practice' arm serves rows
 *                        from the deprecated app — current saves
 *                        only allow article/quiz/exam, so it is
 *                        unreachable and documented, not removed.
 *  - defaultOpenSection which accordion section starts open — the
 *                        one holding the active lesson (Room
 *                        pages highlight the lesson in progress),
 *                        else the first, else none.
 *  - sectionLessonsCount  the section header's lesson count — an
 *                        explicit count wins over deriving from
 *                        the array, else zero.
 *  - shouldShowBadgeCard  the reward card gate — dormant by
 *                        design: the show payload never ships a
 *                        badge, so the card renders only once
 *                        badge data starts arriving.
 */

/**
 * The page's progress summary — the completed count for the hero
 * text and the per-type tallies for the sidebar card.
 */
export const progressSummaryFor = (sections) => {
    const all = (sections || []).flatMap((module) => module.lessons || []);
    const completedLessons = all.filter((lesson) => lesson.completed).length;

    const tally = (type) => {
        const ofType = all.filter((lesson) => lesson.type === type);

        return {
            total: ofType.length,
            completed: ofType.filter((lesson) => lesson.completed).length,
        };
    };

    return {
        completedLessons,
        progressData: [
            { label: 'Articles', ...tally('article') },
            { label: 'Quizzes', ...tally('quiz') },
            { label: 'Exams', ...tally('exam') },
        ],
    };
};

/**
 * The lesson row's icon tag — the component maps tags to glyphs.
 */
export const lessonIconTag = (lesson) => {
    if (lesson.completed) return 'completed';
    if (lesson.type === 'quiz' || lesson.type === 'practice') {
        return 'quiz';
    }
    if (lesson.type === 'exam') return 'exam';

    return 'article';
};

/**
 * Which accordion section starts open — the active lesson's own
 * section, else the first, else none.
 */
export const defaultOpenSection = (sections, activeLessonId) => {
    if (activeLessonId && sections.length > 0) {
        const activeSection = sections.find((section) =>
            section.lessons?.some(
                (lesson) => Number(lesson.id) === Number(activeLessonId),
            ),
        );

        if (activeSection) {
            return `section-${activeSection.id}`;
        }
    }

    return sections.length > 0 ? `section-${sections[0].id}` : undefined;
};

/**
 * The section header's lesson count — explicit count first, the
 * array's length as fallback, zero otherwise.
 */
export const sectionLessonsCount = (section) =>
    section.lessonsCount || section.lessons?.length || 0;

/**
 * The badge reward card's gate — dormant until badge data ever
 * ships with the course.
 */
export const shouldShowBadgeCard = (course) => Boolean(course?.badge);
