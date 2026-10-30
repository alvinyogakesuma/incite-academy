import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import AuthHeader from '@/components/AuthHeader';

export default function AuthLayout({ icon: Icon, title, subtitle, children }) {
    return (
        <>
            <div className="flex min-h-screen">
                {/* Left Column: Hero Banner (Desktop Only) */}
                <div className="bg-primary-700/35 hidden w-1/2 shrink-0 flex-col justify-between overflow-hidden bg-[url('/public/images/auth-image.png')] bg-cover bg-center bg-no-repeat p-10 bg-blend-overlay md:flex">
                    <Link
                        href="/"
                        className="group flex shrink-0 items-center gap-2 self-start text-neutral-50/80 transition-colors duration-200 hover:text-neutral-50"
                    >
                        <ArrowLeft className="size-5 transition-transform duration-300 group-hover:-translate-x-1.5" />
                        <span className="font-inter text-body-sm leading-none font-bold whitespace-nowrap">
                            Back to Home
                        </span>
                    </Link>
                    <div className="relative z-999 max-w-md text-neutral-50">
                        <h2 className="font-poppins text-title-lg leading-relaxed font-bold">
                            Learn. Practice. Succeed.
                        </h2>
                        <p className="font-inter text-body-sm text-neutral-50">
                            Join our community of students and master the CBT
                            INCITE exams with expert course modules and
                            realistic simulations.
                        </p>
                    </div>
                </div>
                {/* Right Column: Form Container */}
                <div className="flex w-full shrink-0 flex-col gap-5 bg-neutral-50 p-6 md:w-1/2 md:p-12 lg:p-16">
                    {/* Mobile Back Button */}
                    <Link
                        href="/"
                        className="group flex shrink-0 items-center gap-2 self-start text-neutral-600 transition-colors duration-200 hover:text-neutral-900 md:hidden"
                    >
                        <ArrowLeft className="size-5 transition-transform duration-300 group-hover:-translate-x-1.5" />
                        <span className="font-inter text-body-sm leading-none font-bold whitespace-nowrap">
                            Back to Home
                        </span>
                    </Link>

                    <AuthHeader icon={Icon} title={title} subtitle={subtitle} />

                    {children}
                </div>
            </div>
        </>
    );
}
