const problems = [
    {
        title: 'Lack of Comprehensive Resources',
        description:
            'Students struggle to find all-in-one study materials that cover every question type and topic area for the CBT INCITE test.',
    },
    {
        title: 'No Clear Study Path',
        description:
            "Without structured guidance, students waste time on unfocused preparation and don't know where to start or what to prioritize.",
    },
    {
        title: 'Limited Practice Opportunities',
        description:
            'Many students lack access to enough practice questions and realistic test simulations to build confidence and identify weak areas.',
    },
];

export default function ProblemsSection() {
    return (
        <section id="problems-section" className="bg-blue-50">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:px-8 lg:py-20">
                <div className="flex flex-col gap-2 text-center">
                    <h2 className="font-poppins text-2xl leading-[1.2] font-bold text-black sm:text-3xl lg:text-[39px]">
                        Have You Ever Faced{' '}
                        <span className="text-blue-700">These Problems</span>
                    </h2>
                    <p className="font-inter text-base leading-relaxed text-gray-600">
                        Preparing for the CBT INCITE test can be overwhelming.
                        See if any of these sound familiar to you:
                    </p>
                </div>
                <div className="flex w-full flex-col gap-8 md:flex-row md:gap-14">
                    <img
                        src="/images/problems-section-image.png"
                        alt="Student looking overwhelmed by scattered study materials"
                        loading="lazy"
                        decoding="async"
                        className="shadow-card hidden aspect-square h-[300px] rounded-2xl object-cover sm:h-[380px] md:block lg:h-[454px]"
                    />
                    <ol className="flex min-w-0 flex-1 flex-col gap-8 pt-0 lg:gap-14 lg:pt-4">
                        {problems.map((problem, index) => (
                            <li
                                key={problem.title}
                                className="flex items-start gap-4"
                            >
                                <div className="font-inter flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-base leading-none font-bold text-white">
                                    {index + 1}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                        {problem.title}
                                    </h3>
                                    <p className="font-inter text-base leading-relaxed text-gray-600">
                                        {problem.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}
