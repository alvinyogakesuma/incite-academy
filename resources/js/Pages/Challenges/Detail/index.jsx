import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    BookOpen,
    Clock,
    Play,
    Star,
    Trophy,
} from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import { attemptPercentageColor, difficultyStyleFor } from './challengeDetail';

/**
 * Challenge detail — the student challenge room entry: the
 * centered challenge card with its stat tiles and past attempts,
 * and the start action opening the timed take screen. Ported from
 * the deprecated app's ChallengeDetail on the current design
 * tokens.
 */
export default function Detail({ challenge, attempts = [] }) {
    const stats = [
        {
            label: 'Minutes',
            value: String(challenge.duration),
            icon: Clock,
            color: 'border border-primary-700/10 bg-primary-50 text-primary-700',
        },
        {
            label: 'Questions',
            value: `${challenge.questions_count} Questions`,
            icon: BookOpen,
            color: 'border border-blue-100 bg-blue-50 text-blue-600',
        },
        {
            label: 'Points',
            value: `${challenge.points} Points`,
            icon: Star,
            color: 'border border-amber-200 bg-amber-50 text-amber-600',
        },
        {
            label: 'Difficulty',
            value: challenge.difficulty,
            icon: Award,
            color: difficultyStyleFor(challenge.difficulty),
        },
    ];

    return (
        <>
            <Head title={challenge.title} />

            <section className="bg-primary-50/40 min-h-screen">
                <main className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-8">
                    {/* Back to Challenges */}
                    <div className="mb-8">
                        <button
                            type="button"
                            onClick={() => router.visit('/challenges')}
                            className="group font-inter text-body-sm hover:text-primary-700 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-semibold text-neutral-500 transition-colors duration-150 outline-none"
                        >
                            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                            <span>Back to Challenges</span>
                        </button>
                    </div>

                    {/* The Challenge Card */}
                    <div className="flex flex-col gap-8 rounded-3xl border border-neutral-950/5 bg-white p-6 shadow-sm md:p-10">
                        {/* Trophy + Title + Description */}
                        <div className="flex flex-col items-center text-center">
                            <div className="border-primary-700/10 bg-primary-50 mb-6 flex size-24 animate-pulse items-center justify-center rounded-full border p-6 shadow-inner">
                                <Trophy className="text-primary-700 size-12 stroke-2" />
                            </div>
                            <h1 className="font-poppins text-title-lg mb-3 font-bold text-neutral-950">
                                {challenge.title}
                            </h1>
                            <p className="font-inter text-body-sm max-w-xl leading-relaxed text-neutral-500">
                                {challenge.description}
                            </p>
                        </div>

                        {/* Stat Tiles */}
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {stats.map((stat) => {
                                const Icon = stat.icon;

                                return (
                                    <div
                                        key={stat.label}
                                        className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-950/5 bg-white p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                                    >
                                        <div
                                            className={`shrink-0 rounded-xl p-2.5 ${stat.color}`}
                                        >
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="font-poppins text-caption leading-snug font-bold text-neutral-950">
                                                {stat.value}
                                            </p>
                                            <p className="font-inter text-caption font-semibold tracking-wider text-neutral-500 uppercase">
                                                {stat.label}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Past Attempts */}
                        <div className="space-y-4">
                            <h2 className="font-inter text-caption font-bold tracking-wider text-neutral-500 uppercase">
                                Past Attempts
                            </h2>
                            <div className="divide-y divide-neutral-950/5 overflow-hidden rounded-2xl border border-neutral-950/5 bg-neutral-50/50">
                                {attempts.length > 0 ? (
                                    attempts.map((attempt, index) => (
                                        <div
                                            key={index}
                                            className="font-inter text-body-sm flex items-center justify-between gap-4 px-5 py-4 text-neutral-950"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="size-2 rounded-full bg-neutral-300" />
                                                <span className="font-medium text-neutral-500">
                                                    {attempt.attempted_at}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <span className="text-neutral-500">
                                                    {attempt.score}/
                                                    {attempt.total}
                                                </span>
                                                <span
                                                    className={attemptPercentageColor(
                                                        attempt.percentage,
                                                    )}
                                                >
                                                    ({attempt.percentage}%)
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="font-inter text-body-sm px-5 py-6 text-center font-medium text-neutral-500">
                                        No attempts yet. Start the challenge to
                                        record your first score!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Start Challenge — opens the take screen */}
                        <button
                            type="button"
                            onClick={() =>
                                router.visit(`/challenges/${challenge.id}/take`)
                            }
                            className="group/btn bg-primary-700 shadow-primary-700/10 mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-4 font-bold shadow-lg transition-all duration-200 hover:opacity-90 hover:shadow-xl active:scale-[0.98]"
                        >
                            <span className="font-inter text-body-sm text-white">
                                Start Challenge
                            </span>
                            <Play className="size-4 fill-white text-white transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                        </button>
                    </div>
                </main>
            </section>
        </>
    );
}

Detail.layout = (page) => <StudentLayout>{page}</StudentLayout>;
