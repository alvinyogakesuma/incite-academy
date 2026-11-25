import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import { Form } from 'radix-ui';
import EmailField from '@/components/EmailField';
import PasswordField from '@/components/PasswordField';
import Button from '@/components/Button';
import AuthFooter from '@/components/AuthFooter';
import AuthLayout from '@/layout/AuthLayout';
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
        token: z.string(),
    })
    .refine(...passwordRefine);

export default function ResetPassword({ email, token }) {
    const [isPending, setIsPending] = useState(false);

    const {
        control,
        handleSubmit,
        clearErrors,
        setError,
        resetField,
        getValues,
        trigger,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(resetPasswordSchema),
        mode: 'onChange',
        defaultValues: {
            email: email ?? '',
            password: '',
            password_confirmation: '',
            token: token ?? '',
        },
    });

    const onValid = (values) => {
        if (isPending) {
            return;
        }

        router.post('/reset-password', values, {
            onStart: () => setIsPending(true),
            onFinish: () => {
                setIsPending(false);
                resetField('password', { keepError: true });
                resetField('password_confirmation', { keepError: true });
            },
            onError: (serverErrors) => {
                clearErrors();
                for (const [field, message] of Object.entries(serverErrors)) {
                    setError(field, { type: 'server', message });
                }
            },
        });
    };

    return (
        <Form.Root
            className="flex w-full flex-col gap-5"
            onSubmit={handleSubmit(onValid)}
            noValidate
        >
            <Controller
                control={control}
                name="email"
                render={({ field }) => (
                    <EmailField
                        name="email"
                        label="Email"
                        type="email"
                        icon={Mail}
                        value={field.value ?? ''}
                        errorMessage={errors.email?.message}
                        autoComplete="email"
                        placeholder="alvin.121140154@student.itera.ac.id"
                        readOnly={Boolean(email)}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        required
                    />
                )}
            />

            <Controller
                control={control}
                name="password"
                render={({ field }) => (
                    <PasswordField
                        name="password"
                        label="Password"
                        icon={Lock}
                        value={field.value ?? ''}
                        errorMessage={errors.password?.message}
                        autoComplete="new-password"
                        placeholder="Minimum 8 Characters"
                        onChange={(e) => {
                            field.onChange(e.target.value);
                            if (
                                getValues('password_confirmation') !== '' ||
                                errors.password_confirmation
                            ) {
                                trigger('password_confirmation');
                            }
                        }}
                        onBlur={field.onBlur}
                        required
                    />
                )}
            />

            <Controller
                control={control}
                name="password_confirmation"
                render={({ field }) => (
                    <PasswordField
                        name="password_confirmation"
                        label="Confirm Password"
                        icon={Lock}
                        value={field.value ?? ''}
                        errorMessage={errors.password_confirmation?.message}
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        required
                    />
                )}
            />

            <Button as="submit" fullWidth loading={isPending}>
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
