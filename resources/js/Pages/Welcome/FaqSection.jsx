import { ChevronDown } from 'lucide-react';
import { Accordion } from 'radix-ui';

const faqs = [
    {
        question: 'What is INCITE Academy',
        answer: 'INCITE Academy is a comprehensive online learning platform designed to help students prepare for the Incite test through expert-created modules, practice exercises, and readiness assessments.',
    },
    {
        question: 'How do I get started?',
        answer: 'Simply create an account and choose your learning path. Our platform will guide you through a personalized onboarding experience to help you get the most out of your study journey.',
    },
    {
        question: 'Can I access the platform on mobile devices',
        answer: 'Yes! INCITE Academy is fully responsive and works on desktop, tablet, and mobile devices. Access your courses and practice tests anytime, anywhere.',
    },
    {
        question: 'What is the price?',
        answer: 'We offer flexible pricing plans to fit your needs. Visit our pricing page or contact our support team for detailed information about current packages and promotions.',
    },
    {
        question: 'What are the instructors qualification?',
        answer: 'Our instructors are experienced educators and subject matter experts with proven track records in helping students succeed in standardized tests like INCITE.',
    },
];

export default function FaqSection() {
    return (
        <section id="faq-section" className="bg-primary-50">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:px-8 lg:py-20">
                <div className="flex flex-col gap-2 text-center">
                    <h2 className="font-poppins text-title sm:text-title-lg lg:text-display font-bold text-neutral-950">
                        Frequently{' '}
                        <span className="text-primary-700">
                            Asked Questions
                        </span>
                    </h2>
                    <p className="font-inter text-body text-neutral-600">
                        Find answers to common questions about INCITE Academy
                    </p>
                </div>
                <Accordion.Root
                    type="multiple"
                    className="flex w-full flex-col gap-6"
                >
                    {faqs.map((faq, index) => (
                        <Accordion.Item
                            key={faq.question}
                            className="rounded-lg bg-neutral-50"
                            value={`item-${index + 1}`}
                        >
                            <Accordion.Header className="flex">
                                <Accordion.Trigger className="group hover:bg-primary-50/50 focus-visible:outline-primary-700 flex w-full cursor-pointer items-center justify-between rounded-t-lg px-6 py-4 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 data-[state=open]:shadow-sm">
                                    <span className="font-poppins text-body-lg font-semibold text-neutral-950">
                                        {faq.question}
                                    </span>
                                    <ChevronDown className="text-primary-700 size-4 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                </Accordion.Trigger>
                            </Accordion.Header>
                            <Accordion.Content className="rounded-b-lg px-6 py-4">
                                <p className="font-inter text-body text-neutral-600">
                                    {faq.answer}
                                </p>
                            </Accordion.Content>
                        </Accordion.Item>
                    ))}
                </Accordion.Root>
            </div>
        </section>
    );
}
