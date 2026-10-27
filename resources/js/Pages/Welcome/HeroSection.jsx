import Button from '@/components/Button';
import Logomark from '@/components/Logomark';

export default function HeroSection() {
    return (
        <section id="hero-section">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-8 sm:px-8 md:flex-row md:gap-20 md:py-12 lg:py-14">
                <div className="flex flex-1 flex-col gap-6">
                    <Logomark size="size-14" />
                    <h1 className="font-poppins text-title-lg sm:text-display-lg lg:text-display-xl font-bold text-neutral-950">
                        Selamat Datang di{' '}
                        <span className="text-primary-700">INCITE Academy</span>
                    </h1>
                    <p className="font-inter text-body text-neutral-500">
                        Unlock your potential through personalized learning
                        experiences. Join our community of passionate learners
                        and start your educational journey today.
                    </p>
                    <div className="flex gap-4">
                        <Button href="/register">Get Started</Button>
                        <Button href="#problems-section" variant="outline">
                            Learn More
                        </Button>
                    </div>
                </div>
                <img
                    src="/images/hero-section-image.png"
                    alt="hero-section-image"
                    className="hidden aspect-3/4 h-[373px] shrink-0 rounded-2xl object-cover shadow-md sm:h-[432px] md:block"
                />
            </div>
        </section>
    );
}
