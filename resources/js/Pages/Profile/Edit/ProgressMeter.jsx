import { Progress } from 'radix-ui';

/**
 * One progress meter — the Radix Progress primitive in the
 * student card's shape: the caption label and bold percentage
 * above a thin rounded track with the primary fill, shared by the
 * profile's course and learning path rows.
 */
export default function ProgressMeter({ label, value }) {
    return (
        <div className="space-y-1.5">
            <div className="font-inter text-caption flex items-center justify-between text-neutral-500">
                <span>{label}</span>
                <span className="font-bold text-neutral-950">{value}%</span>
            </div>
            <Progress.Root
                value={value}
                className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
            >
                <Progress.Indicator
                    className="bg-primary-700 h-full w-full transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${100 - value}%)` }}
                />
            </Progress.Root>
        </div>
    );
}
