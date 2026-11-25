import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Mail } from 'lucide-react';
import { Form } from 'radix-ui';
import EmailField from '@/components/EmailField';
import Button from '@/components/Button';
import AuthFooter from '@/components/AuthFooter';
import Toast from '@/components/Toast';
import AuthLayout from '@/layout/AuthLayout';
import { emailMahasiswaRule } from '@/utils/zodRules.js';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
    email: emailMahasiswaRule,
});

export default function ForgotPassword({ status }) {
    const [toast, setToast] = useState({
        open: false,
        type: 'success',
        title: 'Reset Link Sent',
        description: '',
    });

    useEffect(() => {
        if (!status) {
            return;
        }

        setToast({
            open: true,
            type: 'success',
            title: 'Reset Link Sent',
            description: status,
        });
    }, [status]);

    const [isPending, setIsPending] = useState(false);

    const {
        control,
        handleSubmit,
        clearErrors,
        setError,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        mode: 'onChange',
        defaultValues: {
            email: '',
        },
    });

    const onValid = (values) => {
        if (isPending) {
            return;
        }

        router.post('/forgot-password', values, {
            onStart: () => setIsPending(true),
            onFinish: () => setIsPending(false),
            onSuccess: (page) => {
                const nextStatus = page.props.status;
                if (nextStatus) {
                    setToast({
                        open: true,
                        type: 'success',
                        title: 'Reset Link Sent',
                        description: nextStatus,
                    });
                }
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
        <>
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
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            required
                        />
                    )}
                />

                <Button as="submit" fullWidth loading={isPending}>
                    Send Reset Link
                </Button>

                <AuthFooter
                    message="Remember your password?"
                    href="/login"
                    linkLabel="Sign In"
                />
            </Form.Root>

            <Toast
                open={toast.open}
                onOpenChange={(open) => setToast((prev) => ({ ...prev, open }))}
                title={toast.title}
                description={toast.description}
                type={toast.type}
            />
        </>
    );
}

ForgotPassword.layout = [
    AuthLayout,
    {
        icon: KeyRound,
        title: 'Forgot Password',
        subtitle: "Enter your email and we'll send you a reset link",
    },
];
