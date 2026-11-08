import TextField from './TextField';

export default function NumberField({
    name,
    label,
    type,
    icon: Icon,
    value,
    onChange,
    placeholder,
    autoComplete = 'off',
    errorMessage,
    required = false,
    ...props
}) {
    return (
        <>
            <TextField
                name={name}
                label={label}
                type={type}
                icon={Icon}
                value={value}
                errorMessage={errorMessage}
                autoComplete={autoComplete}
                placeholder={placeholder}
                onChange={onChange}
                required={required}
                {...props}
            />
        </>
    );
}
