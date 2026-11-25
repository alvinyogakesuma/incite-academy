export default function StatItem({ icon: Icon, label, value, className = '' }) {
    return (
        <div className={`flex items-center justify-between ${className}`}>
            <span className="font-inter text-body-sm flex items-center gap-1.5 font-medium text-neutral-500">
                {Icon && (
                    <Icon className="size-3.5 shrink-0 text-neutral-500" />
                )}
                <span>{label}</span>
            </span>
            <span className="font-inter bg-primary-50 text-caption border-primary-700/5 text-primary-700 rounded-full border px-2.5 py-1 font-bold">
                {value}
            </span>
        </div>
    );
}
