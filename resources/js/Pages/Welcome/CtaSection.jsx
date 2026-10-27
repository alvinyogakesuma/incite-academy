import Button from '@/components/Button';

export default function CtaSection() {
    return (
        <section id="cta-section">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-8 lg:py-20">
                <h2 className="font-poppins text-title sm:text-title-lg lg:text-display font-bold text-neutral-950">
                    Ready to{' '}
                    <span className="text-primary-700">
                        Start Your Journey?
                    </span>
                </h2>
                <p className="font-inter text-body max-w-[826px] text-neutral-600">
                    Join thousands of students who are already learning with
                    INCITE Academy. Start your educational journey today and
                    unlock your full potential.
                </p>
                <Button href="/register">Create Account</Button>
            </div>
        </section>
    );
}
