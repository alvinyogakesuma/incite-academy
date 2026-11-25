import { router } from '@inertiajs/react';
import { ArrowRight, Clock, Gauge, ListChecks, Star } from 'lucide-react';

const CATEGORY_GRADIENTS = {
    'Reading Comprehension':
        'radial-gradient(circle at 10% 20%, rgb(87, 108, 217) 0%, rgb(40, 58, 163) 90.2%)',
    'Listening Comprehension':
        'radial-gradient(circle at 10% 20%, rgb(50, 172, 237) 0%, rgb(18, 93, 161) 90.2%)',
    'Structure and Writing Expression':
        'radial-gradient(circle at 10% 20%, rgb(16, 185, 129) 0%, rgb(13, 116, 85) 90.2%)',
};

/**
 * One challenge card of the student listing — built on the
 * student course card's structure: the category gradient cover
 * with the uploaded image and the glassmorphic category chip,
 * the description with the difficulty, duration, questions, and
 * points chips, and the view action. The view action opens the
 * challenge detail page unless an onStart handler overrides it.
 */
export default function StudentChallengeCard({ challenge, onStart }) {
    const gradient =
        CATEGORY_GRADIENTS[challenge.category] ||
        CATEGORY_GRADIENTS['Reading Comprehension'];

    return (
        <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-950/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            {/* Cover Gradient */}
            <div
                className="relative flex h-[140px] w-full shrink-0 items-center justify-center overflow-hidden"
                style={{ background: gradient }}
            >
                {/* Uploaded cover when present, gradient as fallback */}
                {challenge.image_url && (
                    <img
                        src={challenge.image_url}
                        alt={`${challenge.title} cover`}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                )}

                {/* Decorative mesh light effect */}
                <div className="absolute inset-0 bg-white/5 opacity-40 mix-blend-overlay" />
                <div className="absolute inset-0 bg-black/10" />

                {/* Glassmorphic Category Label */}
                <div className="font-inter text-caption absolute bottom-4 left-4 rounded-full border border-white/20 bg-white/20 px-3 py-1 font-bold tracking-wider text-white uppercase backdrop-blur-md">
                    {challenge.category}
                </div>
            </div>

            {/* Card Content */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                <div className="flex flex-1 flex-col space-y-3">
                    {/* Title + Description */}
                    <div className="flex-1 space-y-1.5">
                        <h3 className="font-poppins text-body group-hover:text-primary-700 line-clamp-1 leading-snug font-bold text-neutral-950 transition-colors duration-200">
                            {challenge.title}
                        </h3>
                        <p className="font-inter text-body-sm line-clamp-2 leading-relaxed text-neutral-500">
                            {challenge.description}
                        </p>
                    </div>

                    {/* Difficulty + Duration + Questions + Points Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-950/5 pt-3">
                        <div className="font-inter text-caption flex items-center gap-1 rounded-xl border border-neutral-950/5 bg-neutral-50 px-2.5 py-1.5 text-neutral-500">
                            <Gauge className="size-3.5" />
                            <span>{challenge.difficulty}</span>
                        </div>
                        <div className="font-inter text-caption flex items-center gap-1 rounded-xl border border-neutral-950/5 bg-neutral-50 px-2.5 py-1.5 text-neutral-500">
                            <Clock className="size-3.5" />
                            <span>{challenge.duration} min</span>
                        </div>
                        <div className="font-inter text-caption flex items-center gap-1 rounded-xl border border-neutral-950/5 bg-neutral-50 px-2.5 py-1.5 text-neutral-500">
                            <ListChecks className="size-3.5" />
                            <span>{challenge.questions_count} questions</span>
                        </div>
                        <div className="font-inter text-caption flex items-center gap-1 rounded-xl border border-neutral-950/5 bg-neutral-50 px-2.5 py-1.5 text-neutral-500">
                            <Star className="size-3.5" />
                            <span>{challenge.points} pts</span>
                        </div>
                    </div>
                </div>

                {/* View Challenge — opens the challenge detail */}
                <button
                    type="button"
                    onClick={() =>
                        onStart
                            ? onStart(challenge)
                            : router.visit(`/challenges/${challenge.id}`)
                    }
                    className="group/btn bg-primary-700 shadow-primary-700/10 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full py-2.5 shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                >
                    <span className="font-inter text-body-sm font-bold text-white">
                        View Challenge
                    </span>
                    <ArrowRight className="size-3.5 text-white transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </button>
            </div>
        </div>
    );
}
