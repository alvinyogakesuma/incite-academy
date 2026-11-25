import { useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import StudentCourseContentAccordion from '@/components/StudentCourseContentAccordion';
import StudentCourseRoomActions from '@/components/StudentCourseRoomActions';
import {
    activeLessonContext,
    flatLessonsIn,
    nextVisitUrl,
    previousLessonId,
    roomTitleFor,
} from '@/Pages/Courses/Room/lessonRoom';

/**
 * The lesson room shell — back bar, the lesson viewer card with
 * its navigation actions, and the course outline beside it with
 * the active lesson highlighted. Stripped to real-data mode from
 * the deprecated app's CourseRoomLayout (the mock-data and
 * localStorage machinery never applies here) on the current
 * design tokens.
 */
export default function StudentCourseRoomLayout({
    children,
    course,
    sections,
    activeLessonId = null,
    onComplete,
    isCompleted = false,
    backUrl = null,
    backText = 'Back to Course',
    onBack = null,
    hideDefaultActions = false,
}) {
    // Flat lesson list for the Previous / Next / Finish navigation.
    const flatLessons = useMemo(() => flatLessonsIn(sections), [sections]);

    const { activeIndex, activeLesson, hasPrevious, hasNext } = useMemo(
        () => activeLessonContext(flatLessons, activeLessonId),
        [flatLessons, activeLessonId],
    );

    const navigateToLesson = (id) => {
        router.visit(`/courses/${course.slug}/lessons/${id}`);
    };

    const handlePrevious = () => {
        const id = previousLessonId(flatLessons, activeIndex);

        if (id !== null) {
            navigateToLesson(id);
        }
    };

    const handleNext = () => {
        router.visit(nextVisitUrl(course.slug, flatLessons, activeIndex));
    };

    return (
        <>
            <Head title={roomTitleFor(activeLesson, course.title)} />

            <div className="bg-primary-50/40 min-h-screen">
                <main className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-8">
                    {/* Top Bar for Back / Exit actions */}
                    {backUrl && (
                        <div className="mb-8 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() =>
                                    onBack ? onBack() : router.visit(backUrl)
                                }
                                className="font-inter text-body-sm hover:text-primary-700 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-semibold text-neutral-500 transition-colors duration-150 outline-none"
                            >
                                <ArrowLeft className="size-4" />
                                <span>{backText}</span>
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col items-start gap-6 lg:flex-row">
                        {/* Left column (Lesson Viewer Card) */}
                        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                            <div className="flex w-full flex-col justify-between rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-sm md:p-8">
                                {/* Inner content container */}
                                <div className="w-full flex-1">{children}</div>

                                {!hideDefaultActions && (
                                    <StudentCourseRoomActions
                                        handlePrevious={handlePrevious}
                                        handleNext={handleNext}
                                        toggleMarkReviewed={onComplete}
                                        hasPrevious={hasPrevious}
                                        hasNext={hasNext}
                                        isCurrentCompleted={isCompleted}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Right column (Course Content Accordion) */}
                        <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[380px]">
                            <StudentCourseContentAccordion
                                sections={sections}
                                activeLessonId={activeLessonId}
                                onLessonClick={(lesson) =>
                                    navigateToLesson(lesson.id)
                                }
                            />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
