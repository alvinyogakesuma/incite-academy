import TextField from './TextField';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function PasswordField({
    name,
    label,
    icon: Icon,
    value,
    onChange,
    placeholder,
    autoComplete = 'off',
    errorMessage,
    required = false,
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <TextField
            name={name}
            label={label}
            type={showPassword ? 'text' : 'password'}
            icon={Icon}
            value={value}
            errorMessage={errorMessage}
            autoComplete={autoComplete}
            placeholder={placeholder}
            onChange={onChange}
            required={required}
            {...props}
        >
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="hover:text-primary-700 absolute inset-y-0 right-0 z-10 mr-4 shrink-0 cursor-pointer self-center justify-self-end text-neutral-400 transition-all duration-200 hover:scale-110 active:scale-90"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
                {showPassword ? (
                    <Eye className="size-4" />
                ) : (
                    <EyeOff className="size-4" />
                )}
            </button>
        </TextField>
    );
}
