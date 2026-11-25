import { Link } from '@inertiajs/react';
import { Play } from 'lucide-react';
import ProgressMeter from './ProgressMeter';
import { courseCategoryChipClasses } from './profileProgress';

/**
 * The course progress tab — the student's enrolled courses as
 * unified item cards: the title, a one-line description, the
 * category chips, and the completion meter with the resume action
 * beside it. The progress values ship backend-computed, so the
 * tab's only decision — the category chip's lookup — lives in the
 * covered profileProgress module.
 */
export default function CourseProgressTab({ courses = [] }) {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="font-poppins text-body-lg font-bold text-neutral-950">
                    Course Progress
                </h2>
                <p className="font-inter text-body-sm text-neutral-500">
                    Review progress meters of active assessment training
                    courses.
                </p>
            </div>

            <div className="space-y-4">
                {courses.length > 0 ? (
                    courses.map((course) => (
                        <div
                            key={course.id}
                            className="hover:border-primary-700/20 flex flex-col gap-4 rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm transition-all"
                        >
                            {/* Title + short description */}
                            <div className="space-y-1.5">
                                <h4 className="font-poppins text-body-sm font-bold text-neutral-950">
                                    {course.title}
                                </h4>
                                {course.description && (
                                    <p className="font-inter text-caption line-clamp-1 leading-relaxed text-neutral-500">
                                        {course.description}
                                    </p>
                                )}
                            </div>

                            {/* Chips */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span
                                    className={`font-inter text-caption rounded-md border px-2 py-0.5 font-bold ${courseCategoryChipClasses(course.category)}`}
                                >
                                    {course.category}
                                </span>
                            </div>

                            {/* Meter + action */}
                            <div className="flex items-center gap-4">
                                <div className="min-w-0 flex-1">
                                    <ProgressMeter
                                        label={`${course.completed} of ${course.total} lessons completed`}
                                        value={course.progress}
                                    />
                                </div>

                                <div className="shrink-0">
                                    <Link
                                        href={`/courses/${course.slug}`}
                                        className="border-primary-700/5 bg-primary-50 hover:bg-primary-700 text-primary-700 font-inter text-body-sm flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 font-bold transition-all hover:text-white"
                                    >
                                        <span>Resume</span>
                                        <Play className="size-3 fill-current" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="font-inter text-body-sm py-10 text-center font-medium text-neutral-500">
                        No enrolled courses yet. Start a course to track your
                        progress!
                    </div>
                )}
            </div>
        </div>
    );
}
