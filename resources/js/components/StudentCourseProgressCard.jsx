import { Progress } from 'radix-ui';

/**
 * Course Progress — completion bars per lesson type (articles,
 * quizzes, exams), rendered as accessible Radix progress meters.
 * Ported from the deprecated app's CourseProgressCard on the
 * current design tokens.
 */
export default function StudentCourseProgressCard({ progressData = [] }) {
    if (!progressData || progressData.length === 0) {
        return null;
    }

    return (
        <div className="flex w-full flex-col gap-5 rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-sm">
            {/* Header */}
            <div>
                <h3 className="font-poppins text-body font-bold text-neutral-950">
                    Course Progress
                </h3>
            </div>

            {/* Metrics List */}
            <div className="flex flex-col gap-4">
                {progressData.map((item, idx) => {
                    const total = item.total ?? 0;
                    const completed = item.completed ?? 0;
                    const pct =
                        total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                        <div
                            key={idx}
                            className="font-inter flex flex-col gap-2"
                        >
                            <div className="text-body-sm flex items-center justify-between text-neutral-950">
                                <span className="font-medium">
                                    {item.label}
                                </span>
                                <span className="text-primary-700 font-bold">
                                    {pct}%
                                </span>
                            </div>
                            <Progress.Root
                                value={pct}
                                className="bg-primary-50 relative h-3 w-full overflow-hidden rounded-full border border-neutral-950/5"
                            >
                                <Progress.Indicator
                                    className="bg-primary-700 h-full w-full rounded-full transition-transform duration-500 ease-out"
                                    style={{
                                        transform: `translateX(-${100 - pct}%)`,
                                    }}
                                />
                            </Progress.Root>
                            <p className="text-caption text-neutral-500">
                                {completed} of {total} completed
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
