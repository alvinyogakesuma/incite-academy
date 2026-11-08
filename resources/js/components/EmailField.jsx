import TextField from './TextField';

export default function EmailField({
    name = 'email',
    label = 'email',
    type = 'email',
    icon: Icon,
    value,
    onChange,
    placeholder,
    autoComplete = 'email',
    errorMessage,
    required = true,
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
