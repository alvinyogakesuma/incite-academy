import { Form } from 'radix-ui';

export default function TextField({
    name,
    label,
    type = 'text',
    icon: Icon,
    value,
    onChange,
    onBlur,
    placeholder,
    autoComplete,
    errorMessage,
    required = false,
    ...props
}) {
    const isInvalid = Boolean(errorMessage);

    return (
        <Form.Field
            name={name}
            className="flex w-full flex-col gap-1.5"
            serverInvalid={isInvalid}
        >
            <Form.Label htmlFor={name} className="col-span-full">
                <span className="font-inter text-body-sm font-bold text-neutral-700 transition-colors duration-200 select-none">
                    {label}
                    {required && <span className="ml-0.5 text-red-500">*</span>}
                </span>
            </Form.Label>
            <div className="group relative flex items-center">
                <Form.Control asChild>
                    <input
                        className="font-inter text-body-sm bg-primary-50/40 focus:border-primary-700 focus:ring-primary-700/10 w-full rounded-full border border-neutral-950/5 py-2.5 pr-4.5 pl-11 text-neutral-900 transition-all duration-200 ease-in-out outline-none placeholder:text-neutral-500/50 hover:border-neutral-950/15 focus:bg-white focus:ring-4"
                        id={name}
                        name={name}
                        type={type}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        required={required}
                        placeholder={placeholder}
                        autoComplete={autoComplete}
                        {...props}
                    />
                </Form.Control>
                {Icon && (
                    <Icon
                        className={`${isInvalid ? 'text-error-400' : 'group-focus-within:text-primary-700 text-neutral-400'} pointer-events-none absolute inset-y-0 left-0 z-10 ml-4 size-4 shrink-0 self-center transition-colors duration-200`}
                    />
                )}
            </div>

            {errorMessage && (
                <Form.Message className="font-inter text-body-sm block text-red-500">
                    {errorMessage}
                </Form.Message>
            )}
        </Form.Field>
    );
}
