import { Link } from '@inertiajs/react';
import { CirclePile } from 'lucide-react';

export default function Welcome() {
    return (
        <>
            <header className="sticky top-0 z-999 bg-white/90 py-4 shadow-md backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-8">
                    <Link href="/" className="flex items-center gap-2">
                        <CirclePile className="size-6 text-yellow-300" />
                        <p className="font-poppins text-xs leading-none font-bold whitespace-nowrap text-black">
                            INCITE{' '}
                            <span className="text-blue-700">ACADEMY</span>
                        </p>
                    </Link>
                    <nav className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="font-inter inline-flex cursor-pointer items-center justify-center rounded-full bg-blue-700 px-4 py-2 text-xs font-bold whitespace-nowrap text-white transition-all duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:scale-95"
                        >
                            Login
                        </Link>
                        <Link
                            href="/register"
                            className="font-inter focus-visible:outline-brand inline-flex cursor-pointer items-center justify-center rounded-full border border-blue-700 bg-transparent px-4 py-2 text-xs font-bold whitespace-nowrap text-blue-700 transition-all duration-200 hover:bg-blue-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95"
                        >
                            Sign Up
                        </Link>
                    </nav>
                </div>
            </header>
            <main>
                <section id="hero-section">
                    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-8 sm:px-8 md:flex-row md:gap-20 md:py-12 lg:py-14">
                        <div className="flex flex-1 flex-col gap-6">
                            <CirclePile className="size-14 text-yellow-300" />
                            <h1 className="font-poppins text-4xl leading-[1.2] font-bold text-black sm:text-5xl lg:text-[61px]">
                                Selamat Datang di{' '}
                                <span className="text-blue-700">
                                    INCITE Academy
                                </span>
                            </h1>
                            <p className="font-inter text-base leading-relaxed text-gray-500">
                                Unlock your potential through personalized
                                learning experiences. Join our community of
                                passionate learners and start your educational
                                journey today.
                            </p>
                            <div className="flex gap-4">
                                <Link
                                    href="/register"
                                    className="font-inter inline-flex cursor-pointer items-center justify-center rounded-full bg-blue-700 px-4 py-2 text-xs font-bold whitespace-nowrap text-white transition-all duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:scale-95"
                                >
                                    Get Started
                                </Link>
                                <Link
                                    href="#problems-section"
                                    className="font-inter focus-visible:outline-brand inline-flex cursor-pointer items-center justify-center rounded-full border border-blue-700 bg-transparent px-4 py-2 text-xs font-bold whitespace-nowrap text-blue-700 transition-all duration-200 hover:bg-blue-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95"
                                >
                                    Learn More
                                </Link>
                            </div>
                        </div>
                        <img
                            src="/images/hero-section-image.png"
                            alt="hero-section-image"
                            className="shadow-card hidden aspect-3/4 h-[373px] shrink-0 rounded-2xl object-cover sm:h-[432px] md:block"
                        />
                    </div>
                </section>
                <section id="problems-section" className="bg-blue-50">
                    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:px-8 lg:py-20">
                        <div className="flex flex-col gap-2 text-center">
                            <h2 className="font-poppins text-2xl leading-[1.2] font-bold text-black sm:text-3xl lg:text-[39px]">
                                Have You Ever Faced{' '}
                                <span className="text-blue-700">
                                    These Problems
                                </span>
                            </h2>
                            <p className="font-inter text-base leading-relaxed text-gray-600">
                                Preparing for the CBT INCITE test can be
                                overwhelming. See if any of these sound familiar
                                to you:
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
                                <li className="flex items-start gap-4">
                                    <div className="font-inter flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-base leading-none font-bold text-white">
                                        1
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                            Lack of Comprehensive Resources
                                        </h3>
                                        <p className="font-inter text-base leading-relaxed text-gray-600">
                                            Students struggle to find all-in-one
                                            study materials that cover every
                                            question type and topic area for the
                                            CBT INCITE test.
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="font-inter flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-base leading-none font-bold text-white">
                                        2
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                            No Clear Study Path
                                        </h3>
                                        <p className="font-inter text-base leading-relaxed text-gray-600">
                                            Without structured guidance,
                                            students waste time on unfocused
                                            preparation and don't know where to
                                            start or what to prioritize.
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="font-inter flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-base leading-none font-bold text-white">
                                        3
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                            Limited Practice Opportunities
                                        </h3>
                                        <p className="font-inter text-base leading-relaxed text-gray-600">
                                            Many students lack access to enough
                                            practice questions and realistic
                                            test simulations to build confidence
                                            and identify weak areas.
                                        </p>
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </div>
                </section>
                <section id="features-section"></section>
                <section id="faq-section"></section>
                <section id="cta-section"></section>
            </main>
            <footer></footer>
        </>
    );
}
