import { Link } from '@inertiajs/react';

const variantClasses = {
    solid: 'bg-blue-700 text-white hover:opacity-90',
    outline:
        'border border-blue-700 bg-transparent text-blue-700 hover:bg-blue-700 hover:text-white',
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
            className={`font-inter inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:scale-95 ${variantClasses[variant]} ${className}`}
        >
            {children}
        </Link>
    );
}
