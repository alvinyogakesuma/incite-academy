import { Progress } from 'radix-ui';

/**
 * Student page hero banner — a title block with either an explore
 * stats row or a detail progress block, next to an illustration.
 * Ported from the deprecated app's StudentHero on the current
 * design tokens.
 */
export default function StudentHero({
    title,
    description,
    stats = [],
    image,
    variant = 'explore',
    progress = 0,
    progressText = '',
}) {
    const isDetail = variant === 'detail';

    return (
        <section className="border-b border-neutral-950/5 bg-white">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-8 sm:px-8 md:flex-row md:items-center md:gap-12 md:py-12">
                {/* Left Content */}
                <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
                    <h1 className="font-poppins text-title-lg leading-tight font-bold text-neutral-950">
                        {title}
                    </h1>
                    <p className="font-inter text-body-sm max-w-xl leading-relaxed text-neutral-500">
                        {description}
                    </p>

                    {isDetail ? (
                        <>
                            {/* Detail Metadata Row */}
                            <div className="font-inter text-body-sm flex items-center gap-4 text-neutral-500">
                                {stats.map((stat, index) => {
                                    const Icon = stat.icon;

                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1.5"
                                        >
                                            {Icon && (
                                                <Icon className="size-4 text-neutral-500/80" />
                                            )}
                                            <span>{stat.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Detail Progress Section */}
                            <div className="mt-1 w-full max-w-md space-y-2">
                                <div className="font-inter text-body-sm flex items-center justify-between text-neutral-950">
                                    <span className="font-medium">
                                        Your Progress
                                    </span>
                                    <span className="text-primary-700 font-bold">
                                        {progress}%
                                    </span>
                                </div>
                                <Progress.Root
                                    value={progress}
                                    className="bg-primary-50 relative h-3.5 w-full overflow-hidden rounded-full border border-neutral-950/5"
                                >
                                    <Progress.Indicator
                                        className="bg-primary-700 h-full w-full rounded-full transition-transform duration-500 ease-out"
                                        style={{
                                            transform: `translateX(-${100 - progress}%)`,
                                        }}
                                    />
                                </Progress.Root>
                                {progressText && (
                                    <p className="font-inter text-body-sm text-neutral-500">
                                        {progressText}
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Stats Row (Explore View) */
                        <div className="flex flex-wrap items-center gap-4">
                            {stats.map((stat, index) => {
                                const Icon = stat.icon;

                                let colorClasses =
                                    'border-primary-700/5 bg-primary-700/10 text-primary-700 group-hover:bg-primary-700';
                                if (stat.color === 'blue') {
                                    colorClasses =
                                        'border-blue-100/50 bg-blue-50 text-blue-600 group-hover:bg-blue-600';
                                } else if (stat.color === 'amber') {
                                    colorClasses =
                                        'border-amber-100/50 bg-amber-50 text-amber-600 group-hover:bg-amber-600';
                                } else if (stat.color === 'emerald') {
                                    colorClasses =
                                        'border-emerald-100/50 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600';
                                }

                                return (
                                    <div
                                        key={index}
                                        className="group hover:border-primary-700/10 flex items-center gap-3 rounded-2xl border border-neutral-950/5 bg-neutral-50/50 p-3 shadow-sm transition-all duration-200 hover:shadow-md"
                                    >
                                        <div
                                            className={`${colorClasses} flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 group-hover:text-white`}
                                        >
                                            <Icon className="size-4" />
                                        </div>
                                        <div className="font-inter leading-none">
                                            <p className="font-poppins text-body font-bold text-neutral-950">
                                                {stat.value}
                                            </p>
                                            <p className="text-caption mt-0.5 text-neutral-500">
                                                {stat.label}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Illustration */}
                {image && (
                    <div className="w-full shrink-0 md:w-[320px] lg:w-[400px]">
                        {isDetail ? (
                            <div className="overflow-hidden rounded-2xl border border-neutral-950/5 shadow-md">
                                <img
                                    src={image}
                                    alt={`${title} cover`}
                                    className="h-48 w-full object-cover transition-transform duration-300 hover:scale-102 md:h-64"
                                />
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-neutral-950/5 bg-neutral-50 p-1 shadow-md">
                                <img
                                    src={image}
                                    alt={`${title} illustration`}
                                    className="h-auto w-full rounded-xl object-cover"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
