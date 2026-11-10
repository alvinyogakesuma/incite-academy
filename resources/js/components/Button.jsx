import { Link } from '@inertiajs/react';
import { Form } from 'radix-ui';
import { Loader2 } from 'lucide-react';

const variantClasses = {
    solid: 'bg-primary-700 text-neutral-50 hover:opacity-90',
    outline:
        'border border-primary-700 bg-transparent text-primary-700 hover:bg-primary-700 hover:text-neutral-50',
};

export default function Button({
    as,
    href,
    variant = 'solid',
    fullWidth = false,
    disabled = false,
    loading = false,
    className = '',
    children,
    ...props
}) {
    const classes = `font-inter cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 font-bold whitespace-nowrap text-body-sm transition-all duration-200 active:scale-95 shadow-md shadow-primary-700/10 hover:shadow-lg hover:shadow-primary-700/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 disabled:pointer-events-none disabled:opacity-50 ${fullWidth ? 'flex w-full' : 'inline-flex w-fit'} ${variantClasses[variant]} ${className}`;

    // link mode: navigation — href required, no loading/disabled
    if (as === 'link' || href) {
        return (
            <Link href={href} className={classes} {...props}>
                {children}
            </Link>
        );
    }

    // submit mode: form submission inside Form.Root
    if (as === 'submit') {
        return (
            <Form.Submit
                className={classes}
                disabled={disabled || loading}
                aria-busy={loading}
                {...props}
            >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {children}
            </Form.Submit>
        );
    }

    // action mode (default): plain button, never submits a form
    return (
        <button
            type="button"
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading}
            {...props}
        >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {children}
        </button>
    );
}
