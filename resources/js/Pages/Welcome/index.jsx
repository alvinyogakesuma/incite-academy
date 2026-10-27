import Navbar from '@/components/Navbar';
import HeroSection from './HeroSection';
import ProblemsSection from './ProblemsSection';
import FeaturesSection from './FeaturesSection';
import FaqSection from './FaqSection';
import CtaSection from './CtaSection';
import Footer from './Footer';

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
            <Footer />
        </>
    );
}
