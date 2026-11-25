import { Head, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BookOpen, Clock } from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import { formatDuration } from '@/Pages/Dashboard/Courses/courseTable';
import { enrollButtonState, levelBadgeFor } from './learningPathDetail';

/**
 * Learning path detail — the path's card with its course
 * sequence and the enrollment sidebar: each course row opens the
 * course detail, the enroll action toggles the student's
 * enrollment, and the progress bar reflects their completed
 * lessons across the sequence. Ported from the deprecated app's
 * LearningPathDetail on the current design tokens.
 */
export default function Detail({
    learningPath,
    courses,
    progress,
    isEnrolled,
}) {
    const handleEnrollClick = () => {
        router.post(
            `/learning-paths/${learningPath.id}/enroll`,
            {},
            { preserveScroll: true },
        );
    };

    const badgeClasses = levelBadgeFor(learningPath.level);
    const enrollButton = enrollButtonState(isEnrolled);

    return (
        <>
            <Head title={`${learningPath.title} - Learning Path`} />

            <section className="bg-primary-50/40 min-h-screen">
                <main className="mx-auto max-w-6xl px-4 pt-8 pb-14 sm:px-8">
                    {/* Back to Learning Paths */}
                    <div className="mb-8 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => router.visit('/learning-paths')}
                            className="group font-inter text-body-sm hover:text-primary-700 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-semibold text-neutral-500 transition-colors duration-150 outline-none"
                        >
                            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                            <span>Back to Learning Paths</span>
                        </button>
                    </div>

                    <div className="flex flex-col items-start gap-6 md:gap-8 lg:flex-row">
                        {/* Left column (Main Content) */}
                        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                            {/* The Path Card */}
                            <div className="overflow-hidden rounded-2xl border border-neutral-950/5 bg-white shadow-sm">
                                {learningPath.image_url && (
                                    <div className="relative h-[240px] w-full overflow-hidden sm:h-[320px] md:h-[377px]">
                                        <img
                                            src={learningPath.image_url}
                                            alt={learningPath.title}
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/10" />
                                    </div>
                                )}
                                <div className="flex flex-col gap-3 p-6 md:p-8">
                                    <div
                                        className={`self-start rounded-full px-2.5 py-1 ${badgeClasses}`}
                                    >
                                        <span className="font-inter text-caption leading-none font-bold tracking-wider whitespace-nowrap uppercase">
                                            {learningPath.level}
                                        </span>
                                    </div>
                                    <h1 className="font-poppins text-title-lg font-bold text-neutral-950">
                                        {learningPath.title}
                                    </h1>
                                    <p className="font-inter text-body-sm leading-relaxed text-neutral-500">
                                        {learningPath.description}
                                    </p>
                                </div>
                            </div>

                            {/* Courses in this Path */}
                            <h2 className="font-inter text-caption font-bold tracking-wider text-neutral-500 uppercase">
                                Courses in this Path
                            </h2>

                            <div className="flex flex-col gap-4">
                                {courses.map((course) => (
                                    <div
                                        key={course.id}
                                        className="group flex flex-col justify-between gap-4 rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:flex-row sm:items-center md:p-6"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="bg-primary-700 shadow-primary-700/10 shrink-0 rounded-xl p-3 text-white shadow-sm">
                                                <BookOpen className="size-6" />
                                            </div>
                                            <div className="min-w-0 space-y-1.5">
                                                <h3 className="font-poppins text-body group-hover:text-primary-700 leading-snug font-bold text-neutral-950 transition-colors duration-200">
                                                    {course.title}
                                                </h3>
                                                {course.description && (
                                                    <p className="font-inter text-body-sm line-clamp-2 leading-relaxed text-neutral-500">
                                                        {course.description}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-3 pt-2.5">
                                                    <div className="font-inter text-caption flex items-center gap-1 text-neutral-500">
                                                        <Clock className="size-3.5" />
                                                        <span>
                                                            {formatDuration(
                                                                course.duration,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="font-inter text-caption flex items-center gap-1 text-neutral-500">
                                                        <BookOpen className="size-3.5" />
                                                        <span>
                                                            {course.lessons}{' '}
                                                            Lessons
                                                        </span>
                                                    </div>
                                                    <div className="border-primary-700/15 bg-primary-50 rounded-full border px-2 py-0.5">
                                                        <span className="font-inter text-caption text-primary-700 leading-none font-bold tracking-wider whitespace-nowrap uppercase">
                                                            {course.category}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.visit(
                                                    `/courses/${course.slug}`,
                                                )
                                            }
                                            className="bg-primary-700 font-inter text-body-sm flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4.5 py-2.5 font-bold whitespace-nowrap text-white shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow active:scale-95 sm:w-auto"
                                        >
                                            <span>View Course</span>
                                            <ArrowRight className="size-3.5 text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar (Path Overview) */}
                        <div className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-[90px] lg:w-[300px]">
                            <div className="flex flex-col gap-5 rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm md:p-6">
                                <h3 className="font-poppins text-body leading-none font-bold text-neutral-950">
                                    Path Overview
                                </h3>

                                <div className="space-y-3.5">
                                    <div className="flex items-center justify-between border-b border-neutral-950/5 py-2">
                                        <div className="font-inter text-body-sm flex items-center gap-2 font-medium text-neutral-500">
                                            <Clock className="size-4 text-neutral-500" />
                                            <span>Duration</span>
                                        </div>
                                        <span className="font-inter text-body-sm font-bold text-neutral-950">
                                            {formatDuration(
                                                learningPath.duration,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-neutral-950/5 py-2">
                                        <div className="font-inter text-body-sm flex items-center gap-2 font-medium text-neutral-500">
                                            <BookOpen className="size-4 text-neutral-500" />
                                            <span>Total Courses</span>
                                        </div>
                                        <span className="font-inter text-body-sm font-bold text-neutral-950">
                                            {learningPath.coursesCount} Courses
                                        </span>
                                    </div>
                                </div>

                                <p className="font-inter text-body-sm leading-relaxed text-neutral-500">
                                    Enroll in this learning path to get
                                    structured guidance through all the courses.
                                </p>

                                {/* Enroll toggle */}
                                <button
                                    type="button"
                                    onClick={handleEnrollClick}
                                    className={`font-inter text-body-sm w-full cursor-pointer rounded-xl px-4 py-3 text-center font-bold shadow-sm transition-all duration-200 ${enrollButton.variantClasses}`}
                                >
                                    {enrollButton.label}
                                </button>

                                {/* Path progress — shown once enrolled */}
                                {isEnrolled && (
                                    <div className="animate-in fade-in slide-in-from-top-1 space-y-2 border-t border-neutral-950/5 pt-4 duration-200">
                                        <div className="font-inter text-body-sm flex items-center justify-between">
                                            <span className="font-medium text-neutral-500">
                                                Path Progress
                                            </span>
                                            <span className="text-primary-700 font-bold">
                                                {progress}% Complete
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                                            <div
                                                className="bg-primary-700 h-full rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${progress}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="font-inter text-caption leading-normal text-neutral-500 italic">
                                            Complete the first course to start
                                            earning path badges!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </section>
        </>
    );
}

Detail.layout = (page) => <StudentLayout>{page}</StudentLayout>;
