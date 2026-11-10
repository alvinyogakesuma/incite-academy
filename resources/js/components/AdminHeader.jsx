import Button from '@/components/Button';

export default function AdminHeader({
    title,
    subtitle,
    label,
    onClick,
    icon: Icon,
}) {
    return (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1.5">
                <h1 className="font-poppins text-title md:text-title-lg font-bold text-neutral-950">
                    {title}
                </h1>
                <p className="font-inter text-body-sm text-neutral-500">
                    {subtitle}
                </p>
            </div>
            {onClick && (
                <div className="self-start sm:self-center">
                    <Button onClick={onClick}>
                        {Icon && <Icon className="size-4 shrink-0" />}
                        {label}
                    </Button>
                </div>
            )}
        </div>
    );
}
