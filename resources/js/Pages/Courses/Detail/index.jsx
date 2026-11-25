import { useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { Award, BookOpen, Clock } from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import StudentHero from '@/components/StudentHero';
import StudentAboutCourse from '@/components/StudentAboutCourse';
import StudentCourseContentAccordion from '@/components/StudentCourseContentAccordion';
import StudentCourseProgressCard from '@/components/StudentCourseProgressCard';
import { formatDuration } from '@/Pages/Dashboard/Courses/courseTable';
import { progressSummaryFor, shouldShowBadgeCard } from './courseDetail';

/**
 * Course detail — the student course room entry: a hero banner
 * with the course's progress, the about card, the module/lesson
 * outline whose rows open the lesson room, and the
 * progress-by-type sidebar. The badge reward card renders only
 * when badge data ever ships with the course. Ported from the
 * deprecated app's CourseDetail on the current design tokens.
 */
export default function Detail({ course, sections }) {
    const { about, title, description, duration, lessons, progress, image } =
        course;

    const { completedLessons, progressData } = useMemo(
        () => progressSummaryFor(sections),
        [sections],
    );

    return (
        <>
            <Head title={title} />

            {/* Hero Banner Section using the detail StudentHero */}
            <StudentHero
                variant="detail"
                title={title}
                description={description}
                stats={[
                    { label: formatDuration(duration), icon: Clock },
                    { label: `${lessons} Lessons`, icon: BookOpen },
                ]}
                image={image}
                progress={progress}
                progressText={`${completedLessons} of ${lessons} lessons completed`}
            />

            {/* Two Column Content Area */}
            <section className="bg-primary-50/40 min-h-screen">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 md:py-10">
                    <div className="flex flex-col items-start gap-6 lg:flex-row">
                        {/* Left column (Main Content) */}
                        <div className="flex w-full flex-1 flex-col gap-6">
                            <StudentAboutCourse about={about} />
                            <StudentCourseContentAccordion
                                sections={sections}
                                onLessonClick={(lesson) =>
                                    router.visit(
                                        `/courses/${course.slug}/lessons/${lesson.id}`,
                                    )
                                }
                            />
                        </div>

                        {/* Right column (Sidebar Stats & Badge) */}
                        <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[409px]">
                            <StudentCourseProgressCard
                                progressData={progressData}
                            />

                            {/* Badge Reward Card — dormant until badges
                                ship with the course payload */}
                            {shouldShowBadgeCard(course) && (
                                <div className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm">
                                    <div className="flex min-w-0 items-center gap-4">
                                        <div className="border-primary-700/10 bg-primary-700/5 text-primary-700 shrink-0 rounded-xl border p-2.5">
                                            <Award className="size-6" />
                                        </div>
                                        <div className="font-inter min-w-0">
                                            <p className="font-poppins text-body truncate font-bold text-neutral-950">
                                                {course.badge.title}
                                            </p>
                                            <p className="text-body-sm mt-0.5 truncate text-neutral-500">
                                                Upon completion, gain this badge
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-inter text-body-sm text-primary-700 bg-primary-700/5 shrink-0 rounded-full px-2.5 py-1 font-bold">
                                        {course.badge.status}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

Detail.layout = (page) => <StudentLayout>{page}</StudentLayout>;
