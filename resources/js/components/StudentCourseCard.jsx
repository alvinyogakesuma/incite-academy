import { router } from '@inertiajs/react';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';

const CATEGORY_GRADIENTS = {
    'Reading Comprehension':
        'radial-gradient(circle at 10% 20%, rgb(87, 108, 217) 0%, rgb(40, 58, 163) 90.2%)',
    'Listening Comprehension':
        'radial-gradient(circle at 10% 20%, rgb(50, 172, 237) 0%, rgb(18, 93, 161) 90.2%)',
    'Structure and Writing Expression':
        'radial-gradient(circle at 10% 20%, rgb(16, 185, 129) 0%, rgb(13, 116, 85) 90.2%)',
};

const formatDuration = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/**
 * One course card of the student catalog — cover (the uploaded
 * course image when present, the category gradient as fallback)
 * with its category chip, description, metadata chips, an
 * optional progress bar, and the start action, which navigates to
 * the course's detail page unless an onStart handler overrides
 * it. Ported from the deprecated app's CourseCard (renamed — the
 * admin CourseCard already exists) on the current design tokens
 * and card motion.
 */
export default function StudentCourseCard({ course, onStart }) {
    const gradient =
        CATEGORY_GRADIENTS[course.category] ||
        CATEGORY_GRADIENTS['Reading Comprehension'];
    const progress = course.progress || 0;

    return (
        <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-950/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            {/* Cover Gradient */}
            <div
                className="relative flex h-[140px] w-full shrink-0 items-center justify-center overflow-hidden"
                style={{ background: gradient }}
            >
                {/* Uploaded cover when present, gradient as fallback */}
                {course.image_url && (
                    <img
                        src={course.image_url}
                        alt={`${course.title} cover`}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                )}

                {/* Decorative mesh light effect */}
                <div className="absolute inset-0 bg-white/5 opacity-40 mix-blend-overlay" />
                <div className="absolute inset-0 bg-black/10" />

                {/* Glassmorphic Category Label */}
                <div className="font-inter text-caption absolute bottom-4 left-4 rounded-full border border-white/20 bg-white/20 px-3 py-1 font-bold tracking-wider text-white uppercase backdrop-blur-md">
                    {course.category}
                </div>
            </div>

            {/* Card Content */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                <div className="flex flex-1 flex-col space-y-3">
                    {/* Title + Description */}
                    <div className="flex-1 space-y-1.5">
                        <h3 className="font-poppins text-body group-hover:text-primary-700 line-clamp-1 leading-snug font-bold text-neutral-950 transition-colors duration-200">
                            {course.title}
                        </h3>
                        <p className="font-inter text-body-sm line-clamp-2 leading-relaxed text-neutral-500">
                            {course.short_description}
                        </p>
                    </div>

                    {/* Duration + Lessons Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-950/5 pt-3">
                        <div className="font-inter text-caption flex items-center gap-1 rounded-xl border border-neutral-950/5 bg-neutral-50 px-2.5 py-1.5 text-neutral-500">
                            <Clock className="size-3.5" />
                            <span>{formatDuration(course.total_duration)}</span>
                        </div>
                        <div className="font-inter text-caption flex items-center gap-1 rounded-xl border border-neutral-950/5 bg-neutral-50 px-2.5 py-1.5 text-neutral-500">
                            <BookOpen className="size-3.5" />
                            <span>{course.lessons_count} Lessons</span>
                        </div>
                    </div>

                    {/* Progress bar section */}
                    {progress > 0 && (
                        <div className="space-y-1.5 pt-2">
                            <div className="font-inter text-caption flex items-center justify-between text-neutral-500">
                                <span>Course Progress</span>
                                <span className="font-bold text-neutral-950">
                                    {progress}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                                <div
                                    className="bg-primary-700 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Start Course Button */}
                <button
                    onClick={() =>
                        onStart
                            ? onStart(course)
                            : router.visit(`/courses/${course.slug}`)
                    }
                    className="bg-primary-700 shadow-primary-700/10 group flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full py-2.5 shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                >
                    <span className="font-inter text-body-sm font-bold text-white">
                        {progress === 100
                            ? 'Review Course'
                            : progress > 0
                              ? 'Continue Learning'
                              : 'Start Course'}
                    </span>
                    <ArrowRight className="size-3.5 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
            </div>
        </div>
    );
}
