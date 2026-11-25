import { router } from '@inertiajs/react';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { formatDuration } from '@/Pages/Dashboard/Courses/courseTable';

const LEVEL_GRADIENTS = {
    Beginner:
        'radial-gradient(circle at 10% 20%, rgb(50, 172, 237) 0%, rgb(18, 93, 161) 90.2%)',
    Intermediate:
        'radial-gradient(circle at 10% 20%, rgb(124, 58, 237) 0%, rgb(67, 20, 153) 90.2%)',
    Advanced:
        'radial-gradient(circle at 10% 20%, rgb(240, 80, 115) 0%, rgb(168, 15, 61) 90.2%)',
    'All Levels':
        'radial-gradient(circle at 10% 20%, rgb(87, 108, 217) 0%, rgb(40, 58, 163) 90.2%)',
};

/**
 * One learning path card of the student listing — the level
 * gradient cover with the uploaded image, the glassmorphic level
 * chip, the description with duration and course chips, and the
 * view action. The view action opens the learning path detail
 * page unless an onViewDetails handler overrides it.
 */
export default function StudentLearningPathCard({ path, onViewDetails }) {
    const gradient =
        LEVEL_GRADIENTS[path.level] || LEVEL_GRADIENTS['All Levels'];

    return (
        <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-950/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            {/* Cover Gradient */}
            <div
                className="relative flex h-[140px] w-full shrink-0 items-center justify-center overflow-hidden"
                style={{ background: gradient }}
            >
                {/* Uploaded cover when present, gradient as fallback */}
                {path.image_url && (
                    <img
                        src={path.image_url}
                        alt={`${path.title} cover`}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                )}

                {/* Decorative mesh light effect */}
                <div className="absolute inset-0 bg-white/5 opacity-40 mix-blend-overlay" />
                <div className="absolute inset-0 bg-black/10" />

                {/* Glassmorphic Level Label */}
                <div className="font-inter text-caption absolute bottom-4 left-4 rounded-full border border-white/20 bg-white/20 px-3 py-1 font-bold tracking-wider text-white uppercase backdrop-blur-md">
                    {path.level}
                </div>
            </div>

            {/* Card Content */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                <div className="flex flex-1 flex-col space-y-3">
                    {/* Title + Description */}
                    <div className="flex-1 space-y-1.5">
                        <h3 className="font-poppins text-body group-hover:text-primary-700 line-clamp-1 leading-snug font-bold text-neutral-950 transition-colors duration-200">
                            {path.title}
                        </h3>
                        <p className="font-inter text-body-sm line-clamp-2 leading-relaxed text-neutral-500">
                            {path.description}
                        </p>
                    </div>

                    {/* Duration + Courses Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-950/5 pt-3">
                        <div className="font-inter text-caption flex items-center gap-1 rounded-xl border border-neutral-950/5 bg-neutral-50 px-2.5 py-1.5 text-neutral-500">
                            <Clock className="size-3.5" />
                            <span>{formatDuration(path.total_duration)}</span>
                        </div>
                        <div className="font-inter text-caption flex items-center gap-1 rounded-xl border border-neutral-950/5 bg-neutral-50 px-2.5 py-1.5 text-neutral-500">
                            <BookOpen className="size-3.5" />
                            <span>{path.courses_count} Courses</span>
                        </div>
                    </div>
                </div>

                {/* View Details — opens the learning path detail */}
                <button
                    type="button"
                    onClick={() =>
                        onViewDetails
                            ? onViewDetails(path)
                            : router.visit(`/learning-paths/${path.id}`)
                    }
                    className="group/btn bg-primary-700 shadow-primary-700/10 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full py-2.5 shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                >
                    <span className="font-inter text-body-sm font-bold text-white">
                        View Details
                    </span>
                    <ArrowRight className="size-3.5 text-white transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </button>
            </div>
        </div>
    );
}
