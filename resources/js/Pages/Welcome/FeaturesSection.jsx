import { Clock, MonitorPlay, Users } from 'lucide-react';

const features = [
    {
        icon: Users,
        title: 'Comprehensive Support',
        description:
            'All-in-one platform with everything you need to succeed in one place',
    },
    {
        icon: Clock,
        title: 'Learn on Your Schedule',
        description:
            '24/7 access to course materials from any device, anywhere',
    },
    {
        icon: MonitorPlay,
        title: 'Interactive Tools',
        description:
            'Practice with simulated tests and track your progress in real-time',
    },
];

export default function FeaturesSection() {
    return (
        <section id="features-section" className="bg-blue-900">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-12 sm:px-8 lg:py-16">
                <div className="flex flex-col gap-2 text-center">
                    <h2 className="font-poppins text-2xl leading-[1.2] font-bold text-white sm:text-3xl lg:text-[39px]">
                        Your Success is Our Priority
                    </h2>
                    <p className="font-inter max-w-[772px] text-base leading-relaxed text-gray-300">
                        Don't worry about scattered resources or confusing study
                        paths. We've built a complete solution that adapts to
                        your needs and fits your lifestyle.
                    </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="flex flex-col gap-8 rounded-2xl bg-white p-6"
                        >
                            <div className="shrink-0 self-start rounded-full bg-blue-50 p-4">
                                <feature.icon className="size-8 text-blue-700" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="font-poppins text-xl leading-[1.2] font-semibold text-black">
                                    {feature.title}
                                </h3>
                                <p className="font-inter text-[13px] leading-[1.2] text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
