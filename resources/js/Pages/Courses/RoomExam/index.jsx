import { useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    Award,
    ChevronLeft,
    Clock,
    HelpCircle,
    Hourglass,
    Timer,
} from 'lucide-react';
import StudentCourseRoomLayout from '@/components/StudentCourseRoomLayout';
import StudentLayout from '@/layout/StudentLayout';
import {
    activeLessonContext,
    flatLessonsIn,
    nextButtonLabel,
    nextVisitUrl,
    previousLessonId,
} from '@/Pages/Courses/Room/lessonRoom';

/**
 * The exam lesson room — the lesson's stat cards (questions,
 * points, and the timed condition's minutes), its past attempts,
 * and the Start Exam action opening the timed take screen.
 * Ported from the deprecated app's CourseRoomExam on the current
 * design tokens.
 */
export default function RoomExam({
    course,
    lesson,
    sections,
    completed,
    attempts = [],
}) {
    const flatLessons = useMemo(() => flatLessonsIn(sections), [sections]);

    const { activeIndex, hasPrevious, hasNext } = useMemo(
        () => activeLessonContext(flatLessons, lesson.id),
        [flatLessons, lesson],
    );

    const handlePrevious = () => {
        const id = previousLessonId(flatLessons, activeIndex);

        if (id !== null) {
            router.visit(`/courses/${course.slug}/lessons/${id}`);
        }
    };

    const handleNext = () => {
        router.visit(nextVisitUrl(course.slug, flatLessons, activeIndex));
    };

    return (
        <StudentCourseRoomLayout
            course={course}
            sections={sections}
            activeLessonId={lesson.id}
            isCompleted={completed}
            backUrl={`/courses/${course.slug}`}
            backText="Back to Course"
            hideDefaultActions
        >
            <div className="space-y-8 py-2">
                <div className="flex justify-center">
                    <div className="bg-primary-50 flex size-20 items-center justify-center rounded-full p-5 shadow-inner">
                        <Hourglass className="text-primary-700 size-10 stroke-[2.5]" />
                    </div>
                </div>

                <div className="space-y-2 text-center">
                    <h1 className="font-poppins text-title-lg leading-tight font-bold text-neutral-950">
                        {lesson.title}
                    </h1>
                    <p className="font-inter text-body-sm text-neutral-500">
                        Test your understanding under timed conditions
                    </p>
                </div>

                <div className="font-inter grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="bg-primary-50 flex items-center gap-4 rounded-2xl p-5">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                            <HelpCircle className="text-primary-700 size-6" />
                        </div>
                        <div>
                            <div className="text-title text-primary-700 leading-none font-bold">
                                {lesson.questions_count}
                            </div>
                            <div className="text-caption mt-1 font-semibold tracking-wider text-neutral-500 uppercase">
                                Questions
                            </div>
                        </div>
                    </div>
                    <div className="bg-primary-50 flex items-center gap-4 rounded-2xl p-5">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                            <Award className="text-primary-700 size-6" />
                        </div>
                        <div>
                            <div className="text-title text-primary-700 leading-none font-bold">
                                {lesson.points}
                            </div>
                            <div className="text-caption mt-1 font-semibold tracking-wider text-neutral-500 uppercase">
                                Total Points
                            </div>
                        </div>
                    </div>
                    <div className="bg-primary-50 flex items-center gap-4 rounded-2xl p-5">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                            <Timer className="text-primary-700 size-6" />
                        </div>
                        <div>
                            <div className="text-title text-primary-700 leading-none font-bold">
                                {lesson.duration}
                            </div>
                            <div className="text-caption mt-1 font-semibold tracking-wider text-neutral-500 uppercase">
                                Minutes
                            </div>
                        </div>
                    </div>
                </div>

                <div className="font-inter space-y-4">
                    <h2 className="text-body-sm font-bold tracking-wider text-neutral-500 uppercase">
                        Past Attempts
                    </h2>
                    {attempts.length > 0 ? (
                        <div className="space-y-2">
                            {attempts.map((attempt, i) => (
                                <div
                                    key={i}
                                    className="bg-primary-50 flex items-center justify-between rounded-xl p-4"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-body-sm text-primary-700 font-bold">
                                            {attempt.score}/{attempt.total}
                                        </span>
                                        <span className="text-body-sm text-neutral-500">
                                            ({attempt.percentage}%)
                                        </span>
                                        <span className="text-caption text-neutral-500">
                                            {attempt.correct}/
                                            {attempt.total_questions} correct
                                        </span>
                                    </div>
                                    <span className="text-body-sm text-neutral-500">
                                        {attempt.attempted_at}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-primary-50 rounded-xl p-5 text-center">
                            <Clock className="mx-auto mb-2 size-5 text-neutral-300" />
                            <p className="text-body-sm font-medium text-neutral-400">
                                No past attempts yet
                            </p>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/courses/${course.slug}/lessons/${lesson.id}/take`,
                        )
                    }
                    className="bg-primary-700 hover:bg-primary-600 font-inter text-body w-full cursor-pointer rounded-xl py-4 text-center font-bold text-white shadow transition-all duration-150 active:scale-95"
                >
                    Start Exam
                </button>

                <div className="font-inter mt-6 flex w-full items-center justify-between gap-4 border-t border-neutral-950/5 pt-6">
                    <button
                        onClick={handlePrevious}
                        disabled={!hasPrevious}
                        className={`text-body-sm flex items-center gap-1.5 rounded-xl border px-4.5 py-2.5 font-semibold transition-all duration-150 ${
                            hasPrevious
                                ? 'border-primary-700 text-primary-700 hover:bg-primary-700/5 cursor-pointer'
                                : 'cursor-not-allowed border-neutral-200 text-neutral-300'
                        }`}
                    >
                        <ChevronLeft className="size-4" />
                        <span>Previous</span>
                    </button>

                    <button
                        onClick={handleNext}
                        className="bg-primary-700 hover:bg-primary-600 font-inter text-body-sm flex cursor-pointer items-center justify-center rounded-xl px-6 py-2.5 font-semibold text-white transition-all duration-150 active:scale-95"
                    >
                        <span>{nextButtonLabel(hasNext)}</span>
                    </button>
                </div>
            </div>
        </StudentCourseRoomLayout>
    );
}

RoomExam.layout = (page) => <StudentLayout>{page}</StudentLayout>;
