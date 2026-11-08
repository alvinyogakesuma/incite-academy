import { Link } from '@inertiajs/react';

export default function AuthFooter({
    message,
    href,
    linkLabel,
    method = 'get',
}) {
    return (
        <p className="font-inter text-body-sm self-center text-neutral-500">
            {message}{' '}
            <Link
                href={href}
                className="text-primary-700 hover:text-primary-800 cursor-pointer font-bold transition-colors duration-200"
                method={method}
            >
                {linkLabel}
            </Link>
        </p>
    );
}
