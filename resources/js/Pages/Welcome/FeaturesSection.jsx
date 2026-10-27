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
        <section id="features-section" className="bg-primary-900">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-12 sm:px-8 lg:py-16">
                <div className="flex flex-col gap-2 text-center">
                    <h2 className="font-poppins text-title sm:text-title-lg lg:text-display font-bold text-neutral-50">
                        Your Success is Our Priority
                    </h2>
                    <p className="font-inter text-body max-w-[772px] text-neutral-300">
                        Don't worry about scattered resources or confusing study
                        paths. We've built a complete solution that adapts to
                        your needs and fits your lifestyle.
                    </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="flex flex-col gap-8 rounded-2xl bg-neutral-50 p-6"
                        >
                            <div className="bg-primary-50 shrink-0 self-start rounded-full p-4">
                                <feature.icon className="text-primary-700 size-8" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="font-poppins text-body-lg font-semibold text-neutral-950">
                                    {feature.title}
                                </h3>
                                <p className="font-inter text-body-sm text-neutral-600">
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
