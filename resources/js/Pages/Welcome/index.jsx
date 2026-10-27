import { Link } from '@inertiajs/react';
import { CirclePile } from 'lucide-react';

import Navbar from '@/components/Navbar';
import HeroSection from './HeroSection';
import ProblemsSection from './ProblemsSection';
import FeaturesSection from './FeaturesSection';
import FaqSection from './FaqSection';

export default function Welcome() {
    return (
        <>
            <Navbar />
            <main>
                <HeroSection />
                <ProblemsSection />
                <FeaturesSection />
                <FaqSection />
                <section id="cta-section">
                    <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-8 lg:py-20">
                        <h2 className="font-poppins text-2xl leading-[1.2] font-bold text-black sm:text-3xl lg:text-[39px]">
                            Ready to{' '}
                            <span className="text-blue-700">
                                Start Your Journey?
                            </span>
                        </h2>
                        <p className="font-inter max-w-[826px] text-base leading-relaxed text-gray-600">
                            Join thousands of students who are already learning
                            with INCITE Academy. Start your educational journey
                            today and unlock your full potential.
                        </p>
                        <Link
                            href="/register"
                            className="font-inter inline-flex cursor-pointer items-center justify-center rounded-full bg-blue-700 px-4 py-2 text-xs font-bold whitespace-nowrap text-white transition-all duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:scale-95"
                        >
                            Create Account
                        </Link>
                    </div>
                </section>
            </main>
            <footer className="bg-blue-50 py-8">
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 px-4 text-center sm:px-8">
                    <Link href="/" className="flex items-center gap-2">
                        <CirclePile className="size-6 text-yellow-300" />
                        <p className="font-poppins text-xs leading-none font-bold whitespace-nowrap text-black">
                            INCITE{' '}
                            <span className="text-blue-700">ACADEMY</span>
                        </p>
                    </Link>
                    <p className="font-inter text-[13px] text-gray-600">
                        &copy; 2026 INCITE Academy. All rights reserved.
                    </p>
                </div>
            </footer>
        </>
    );
}
