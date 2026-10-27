import { Link } from '@inertiajs/react';
import { CirclePile } from 'lucide-react';

import Navbar from '@/components/Navbar';
import HeroSection from './HeroSection';
import ProblemsSection from './ProblemsSection';
import FeaturesSection from './FeaturesSection';
import FaqSection from './FaqSection';
import CtaSection from './CtaSection';

export default function Welcome() {
    return (
        <>
            <Navbar />
            <main>
                <HeroSection />
                <ProblemsSection />
                <FeaturesSection />
                <FaqSection />
                <CtaSection />
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
