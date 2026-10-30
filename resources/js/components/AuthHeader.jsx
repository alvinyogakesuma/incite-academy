export default function AuthHeader({ icon: Icon, title, subtitle }) {
    return (
        <div className="flex flex-col gap-5">
            <div className="bg-primary-700 shrink-0 self-start rounded-2xl p-3 shadow-md/20 shadow-lg">
                <Icon className="size-7 text-neutral-50" />
            </div>
            <div>
                <h1 className="font-poppins text-title-lg font-bold text-neutral-900">
                    {title}
                </h1>
                <p className="font-inter text-body-sm text-neutral-500">
                    {subtitle}
                </p>
            </div>
        </div>
    );
}
