import { Link } from '@inertiajs/react';
import { CirclePile, ChevronDown } from 'lucide-react';
import { Accordion } from 'radix-ui';

import Navbar from '@/components/Navbar';
import HeroSection from './HeroSection';
import ProblemsSection from './ProblemsSection';
import FeaturesSection from './FeaturesSection';

export default function Welcome() {
    return (
        <>
            <Navbar />
            <main>
                <HeroSection />
                <ProblemsSection />
                <FeaturesSection />
                <section id="faq-section" className="bg-blue-50">
                    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:px-8 lg:py-20">
                        <div className="flex flex-col gap-2 text-center">
                            <h2 className="font-poppins text-2xl leading-[1.2] font-bold text-black sm:text-3xl lg:text-[39px]">
                                Frequently{' '}
                                <span className="text-blue-700">
                                    Asked Questions
                                </span>
                            </h2>
                            <p className="font-inter text-base leading-relaxed text-gray-600">
                                Find answers to common questions about INCITE
                                Academy
                            </p>
                        </div>
                        <Accordion.Root
                            type="multiple"
                            className="flex w-full flex-col gap-6"
                        >
                            <Accordion.Item
                                className="rounded-lg bg-white"
                                value="item-1"
                            >
                                <Accordion.Header className="flex">
                                    <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between rounded-t-lg px-6 py-4 text-left transition-colors duration-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 data-[state=open]:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2)]">
                                        <span className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                            What is INCITE Academy
                                        </span>
                                        <ChevronDown className="size-4 shrink-0 text-blue-700 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                    </Accordion.Trigger>
                                </Accordion.Header>
                                <Accordion.Content className="rounded-b-lg px-6 py-4">
                                    <p className="font-inter text-base leading-relaxed text-gray-600">
                                        INCITE Academy is a comprehensive online
                                        learning platform designed to help
                                        students prepare for the Incite test
                                        through expert-created modules, practice
                                        exercises, and readiness assessments.
                                    </p>
                                </Accordion.Content>
                            </Accordion.Item>
                            <Accordion.Item
                                className="rounded-lg bg-white"
                                value="item-2"
                            >
                                <Accordion.Header className="flex">
                                    <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between rounded-t-lg px-6 py-4 text-left transition-colors duration-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 data-[state=open]:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2)]">
                                        <span className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                            How do I get started?
                                        </span>
                                        <ChevronDown className="size-4 shrink-0 text-blue-700 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                    </Accordion.Trigger>
                                </Accordion.Header>
                                <Accordion.Content className="rounded-b-lg px-6 py-4">
                                    <p className="font-inter text-base leading-relaxed text-gray-600">
                                        Simply create an account and choose your
                                        learning path. Our platform will guide
                                        you through a personalized onboarding
                                        experience to help you get the most out
                                        of your study journey.
                                    </p>
                                </Accordion.Content>
                            </Accordion.Item>
                            <Accordion.Item
                                className="rounded-lg bg-white"
                                value="item-3"
                            >
                                <Accordion.Header className="flex">
                                    <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between rounded-t-lg px-6 py-4 text-left transition-colors duration-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 data-[state=open]:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2)]">
                                        <span className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                            Can I access the platform on mobile
                                            devices
                                        </span>
                                        <ChevronDown className="size-4 shrink-0 text-blue-700 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                    </Accordion.Trigger>
                                </Accordion.Header>
                                <Accordion.Content className="rounded-b-lg px-6 py-4">
                                    <p className="font-inter text-base leading-relaxed text-gray-600">
                                        Yes! INCITE Academy is fully responsive
                                        and works on desktop, tablet, and mobile
                                        devices. Access your courses and
                                        practice tests anytime, anywhere.
                                    </p>
                                </Accordion.Content>
                            </Accordion.Item>
                            <Accordion.Item
                                className="rounded-lg bg-white"
                                value="item-4"
                            >
                                <Accordion.Header className="flex">
                                    <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between rounded-t-lg px-6 py-4 text-left transition-colors duration-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 data-[state=open]:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2)]">
                                        <span className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                            What is the price?
                                        </span>
                                        <ChevronDown className="size-4 shrink-0 text-blue-700 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                    </Accordion.Trigger>
                                </Accordion.Header>
                                <Accordion.Content className="rounded-b-lg px-6 py-4">
                                    <p className="font-inter text-base leading-relaxed text-gray-600">
                                        We offer flexible pricing plans to fit
                                        your needs. Visit our pricing page or
                                        contact our support team for detailed
                                        information about current packages and
                                        promotions.
                                    </p>
                                </Accordion.Content>
                            </Accordion.Item>
                            <Accordion.Item
                                className="rounded-lg bg-white"
                                value="item-5"
                            >
                                <Accordion.Header className="flex">
                                    <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between rounded-t-lg px-6 py-4 text-left transition-colors duration-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 data-[state=open]:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2)]">
                                        <span className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                            What are the instructors
                                            qualification?
                                        </span>
                                        <ChevronDown className="size-4 shrink-0 text-blue-700 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                    </Accordion.Trigger>
                                </Accordion.Header>
                                <Accordion.Content className="rounded-b-lg px-6 py-4">
                                    <p className="font-inter text-base leading-relaxed text-gray-600">
                                        Our instructors are experienced
                                        educators and subject matter experts
                                        with proven track records in helping
                                        students succeed in standardized tests
                                        like INCITE.
                                    </p>
                                </Accordion.Content>
                            </Accordion.Item>
                        </Accordion.Root>
                    </div>
                </section>
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
