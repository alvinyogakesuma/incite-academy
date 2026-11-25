import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import ProgressMeter from './ProgressMeter';
import { pathStatusChip } from './profileProgress';
import { levelBadgeFor } from '@/Pages/LearningPaths/Detail/learningPathDetail';

/**
 * The learning paths tab — the student's enrolled paths as unified
 * item cards: the title, a one-line description, the level and
 * status chips, and the completion meter with the details action
 * beside it. The level chip rides the learning path detail's
 * covered lookup (this tab's verbatim duplicate of its palette is
 * eliminated); the status chip's Active-vs-Enrolled decision lives
 * in the covered profileProgress module.
 */
export default function PathsTab({ paths = [] }) {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="font-poppins text-body-lg font-bold text-neutral-950">
                    Learning Paths
                </h2>
                <p className="font-inter text-body-sm text-neutral-500">
                    Explore structured tracks that bundle assessment resources
                    to prepare for benchmarks.
                </p>
            </div>

            <div className="space-y-4">
                {paths.length > 0 ? (
                    paths.map((path) => {
                        const chip = pathStatusChip(path.progress);

                        return (
                            <div
                                key={path.id}
                                className="hover:border-primary-700/20 flex flex-col gap-4 rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm transition-all"
                            >
                                {/* Title + short description */}
                                <div className="space-y-1.5">
                                    <h4 className="font-poppins text-body-sm font-bold text-neutral-950">
                                        {path.title}
                                    </h4>
                                    {path.description && (
                                        <p className="font-inter text-caption line-clamp-1 leading-relaxed text-neutral-500">
                                            {path.description}
                                        </p>
                                    )}
                                </div>

                                {/* Chips */}
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span
                                        className={`font-inter text-caption rounded-md border px-2 py-0.5 font-bold ${levelBadgeFor(path.level)}`}
                                    >
                                        {path.level}
                                    </span>
                                    <span
                                        className={`font-inter text-caption rounded-md border px-2 py-0.5 font-bold ${chip.classes}`}
                                    >
                                        {chip.label}
                                    </span>
                                </div>

                                {/* Meter + action */}
                                <div className="flex items-center gap-4">
                                    <div className="min-w-0 flex-1">
                                        <ProgressMeter
                                            label="Path completion progress"
                                            value={path.progress}
                                        />
                                    </div>

                                    <div className="shrink-0">
                                        <Link
                                            href={`/learning-paths/${path.id}`}
                                            className="border-primary-700/5 bg-primary-50 hover:bg-primary-700 text-primary-700 font-inter text-body-sm flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 font-bold transition-all hover:text-white"
                                        >
                                            <span>Details</span>
                                            <ChevronRight className="size-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="font-inter text-body-sm py-10 text-center font-medium text-neutral-500">
                        No enrolled learning paths yet. Explore learning paths
                        to get started!
                    </div>
                )}
            </div>
        </div>
    );
}
