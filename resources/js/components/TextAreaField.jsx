import { Form } from 'radix-ui';

export default function TextAreaField({
    name,
    label,
    value,
    onChange,
    placeholder,
    errorMessage = '',
    required = false,
    rows = 4,
    className = '',
    ...props
}) {
    const isInvalid = Boolean(errorMessage);

    return (
        <Form.Field
            name={name}
            serverInvalid={isInvalid}
            className={`flex w-full flex-col gap-1.5 ${className}`}
        >
            <Form.Label htmlFor={name}>
                <span className="font-inter text-body-sm font-bold text-neutral-700 transition-colors duration-200 select-none">
                    {label}
                    {required && (
                        <span className="text-error-500 ml-0.5">*</span>
                    )}
                </span>
            </Form.Label>
            <textarea
                className={`font-inter text-body-sm bg-primary-50/40 w-full resize-none rounded-2xl border border-neutral-950/5 px-4.5 py-2.5 transition-all duration-200 ease-in-out outline-none placeholder:text-neutral-500/50 focus:ring-4 ${isInvalid ? 'border-error-500 bg-error-50/20 focus:border-error-500 focus:ring-error-100' : 'focus:border-primary-700 focus:ring-primary-700/10 text-neutral-900 hover:border-neutral-950/15 focus:bg-white'}`}
                id={name}
                name={name}
                rows={rows}
                value={value}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                {...props}
            />
            {errorMessage && (
                <Form.Message className="font-inter text-body-sm text-error-500 block">
                    {errorMessage}
                </Form.Message>
            )}
        </Form.Field>
    );
}
