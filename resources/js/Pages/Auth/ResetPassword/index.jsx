import { useForm } from '@inertiajs/react';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import { Form } from 'radix-ui';
import EmailField from '@/components/EmailField';
import PasswordField from '@/components/PasswordField';
import Button from '@/components/Button';
import AuthFooter from '@/components/AuthFooter';
import AuthLayout from '@/layout/AuthLayout';
import zodFieldErrors from '@/utils/zodFieldErrors';
import {
    emailMahasiswaRule,
    passwordRule,
    passwordRefine,
} from '@/utils/zodRules.js';
import { z } from 'zod';

const resetPasswordSchema = z
    .object({
        email: emailMahasiswaRule,
        password: passwordRule,
        password_confirmation: z.string(),
    })
    .refine(...passwordRefine);

export default function ResetPassword({ email, token }) {
    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
        setError,
        clearErrors,
    } = useForm({
        email: email,
        password: '',
        password_confirmation: '',
        token: token,
    });

    const handleFieldChange = (field, value) => {
        setData(field, value);

        const result = resetPasswordSchema.shape[field].safeParse(value);

        if (result.success) {
            clearErrors(field);
        } else {
            setError(field, result.error.issues[0].message);
        }
    };

    const handlePasswordChange = (field, value) => {
        handleFieldChange(field, value);

        const otherValue =
            field === 'password' ? data.password_confirmation : data.password;

        if (value !== '' && otherValue !== '') {
            if (value === otherValue) {
                clearErrors('password_confirmation');
            } else {
                setError('password_confirmation', 'Passwords do not match');
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const result = resetPasswordSchema.safeParse(data);

        if (!result.success) {
            clearErrors();
            setError(zodFieldErrors(result.error));
            return;
        }

        clearErrors();
        post('/reset-password', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <Form.Root
            className="flex w-full flex-col gap-5"
            onSubmit={handleSubmit}
            noValidate
        >
            <EmailField
                name="email"
                label="Email"
                type="email"
                icon={Mail}
                value={data.email}
                errorMessage={errors.email}
                autoComplete="email"
                placeholder="alvin.121140154@student.itera.ac.id"
                readOnly={Boolean(email)}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                required
            />

            <PasswordField
                name="password"
                label="Password"
                icon={Lock}
                value={data.password}
                errorMessage={errors.password}
                autoComplete="new-password"
                placeholder="Minimum 8 Characters"
                onChange={(e) =>
                    handlePasswordChange('password', e.target.value)
                }
                required
            />

            <PasswordField
                name="password_confirmation"
                label="Confirm Password"
                icon={Lock}
                value={data.password_confirmation}
                errorMessage={errors.password_confirmation}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                onChange={(e) =>
                    handlePasswordChange(
                        'password_confirmation',
                        e.target.value,
                    )
                }
                required
            />

            <Button as="submit" fullWidth loading={processing}>
                Reset Password
            </Button>

            <AuthFooter message="Back to" href="/login" linkLabel="Sign In" />
        </Form.Root>
    );
}

ResetPassword.layout = [
    AuthLayout,
    {
        icon: ShieldCheck,
        title: 'Reset Password',
        subtitle: 'Choose a new password for your account',
    },
];
