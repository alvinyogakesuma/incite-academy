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
        <section id="faq-section" className="bg-blue-50">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:px-8 lg:py-20">
                <div className="flex flex-col gap-2 text-center">
                    <h2 className="font-poppins text-2xl leading-[1.2] font-bold text-black sm:text-3xl lg:text-[39px]">
                        Frequently{' '}
                        <span className="text-blue-700">Asked Questions</span>
                    </h2>
                    <p className="font-inter text-base leading-relaxed text-gray-600">
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
                            className="rounded-lg bg-white"
                            value={`item-${index + 1}`}
                        >
                            <Accordion.Header className="flex">
                                <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between rounded-t-lg px-6 py-4 text-left transition-colors duration-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 data-[state=open]:shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2)]">
                                    <span className="font-poppins text-lg leading-[1.2] font-semibold text-black lg:text-xl">
                                        {faq.question}
                                    </span>
                                    <ChevronDown className="size-4 shrink-0 text-blue-700 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                </Accordion.Trigger>
                            </Accordion.Header>
                            <Accordion.Content className="rounded-b-lg px-6 py-4">
                                <p className="font-inter text-base leading-relaxed text-gray-600">
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
