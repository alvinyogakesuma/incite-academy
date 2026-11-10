import { Form, Select } from 'radix-ui';
import { ChevronDown } from 'lucide-react';

export default function SelectField({
    name,
    label,
    options = [],
    value,
    icon: Icon,
    onValueChange,
    placeholder = 'Select an option',
    errorMessage = '',
    required = false,
    inForm = true,
    className = '',
}) {
    const isInvalid = Boolean(errorMessage);

    // the Select tree — identical in both modes (Select.* is form-agnostic)
    const selectTree = (
        <Select.Root
            value={value}
            onValueChange={onValueChange}
            required={required}
        >
            <Select.Trigger
                id={name}
                className={`group font-inter text-body-sm relative flex w-full cursor-pointer items-center rounded-full border ${Icon ? 'pr-4.5 pl-11' : 'px-4.5'} py-2.5 text-left transition-all duration-200 ease-in-out outline-none ${
                    isInvalid
                        ? 'border-error-500 bg-error-50/20 focus:border-error-500 focus:ring-error-100 focus:ring-4'
                        : 'bg-primary-50/40 focus:border-primary-700 focus:ring-primary-700/10 border-neutral-950/5 hover:border-neutral-950/15 focus:bg-neutral-50 focus:ring-4 data-[placeholder]:text-neutral-500/50'
                }`}
            >
                {Icon && (
                    <Icon
                        aria-hidden="true"
                        className={`${isInvalid ? 'text-error-400' : 'group-focus-within:text-primary-700 text-neutral-400'} pointer-events-none absolute inset-y-0 left-0 z-10 ml-4 size-4 shrink-0 self-center transition-colors duration-200`}
                    />
                )}
                <Select.Value placeholder={placeholder} />
                <Select.Icon className="ml-auto shrink-0">
                    <ChevronDown className="group-focus-within:text-primary-700 size-4 text-neutral-400 transition-colors duration-200" />
                </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
                <Select.Content
                    position="popper"
                    sideOffset={6}
                    className="z-50 max-h-64 w-max max-w-80 min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-2xl border border-neutral-950/5 bg-neutral-50 p-1.5 shadow-xl"
                >
                    <Select.Viewport>
                        {options.map((option) => (
                            <Select.Item
                                key={option}
                                value={option}
                                className="font-inter data-[highlighted]:bg-primary-50/60 data-[highlighted]:text-primary-700 data-[state=checked]:text-primary-700 text-body-sm flex cursor-pointer items-center truncate rounded-xl px-3.5 py-2.5 text-slate-700 transition-colors duration-150 outline-none select-none data-[state=checked]:font-bold"
                            >
                                <Select.ItemText>{option}</Select.ItemText>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );

    // ── Standalone: just the Select, wrapped for className ─────
    // No label, no error text, no Radix form wrappers —
    // the caller composes those around it.
    if (!inForm) {
        return <div className={`w-full ${className}`}>{selectTree}</div>;
    }

    // ── Form mode: full Radix form field ────────────────────────
    return (
        <Form.Field
            name={name}
            serverInvalid={isInvalid}
            className={`w-full ${className}`}
        >
            <div className="group flex w-full flex-col gap-2">
                <Form.Label htmlFor={name}>
                    <span
                        className={`font-inter text-body-sm font-bold transition-colors duration-200 select-none ${
                            isInvalid
                                ? 'text-error-500'
                                : 'group-focus-within:text-primary-700 text-neutral-700'
                        }`}
                    >
                        {label}
                        {required && (
                            <span className="text-error-500 ml-0.5">*</span>
                        )}
                    </span>
                </Form.Label>

                {selectTree}
            </div>

            {errorMessage && (
                <Form.Message className="font-inter text-caption text-error-500 mt-2 block">
                    {errorMessage}
                </Form.Message>
            )}
        </Form.Field>
    );
}
