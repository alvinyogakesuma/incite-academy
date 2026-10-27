import { Link } from '@inertiajs/react';

const variantClasses = {
    solid: 'bg-primary-700 text-neutral-50 hover:opacity-90',
    outline:
        'border border-primary-700 bg-transparent text-primary-700 hover:bg-primary-700 hover:text-neutral-50',
};

export default function Button({
    href,
    variant = 'solid',
    className = '',
    children,
}) {
    return (
        <Link
            href={href}
            className={`font-inter text-body-sm focus-visible:outline-primary-700 inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 font-bold whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95 ${variantClasses[variant]} ${className}`}
        >
            {children}
        </Link>
    );
}
