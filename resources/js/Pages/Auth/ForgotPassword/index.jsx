import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { KeyRound, Mail } from 'lucide-react';
import { Form } from 'radix-ui';
import EmailField from '@/components/EmailField';
import Button from '@/components/Button';
import AuthFooter from '@/components/AuthFooter';
import Toast from '@/components/Toast';
import AuthLayout from '@/layout/AuthLayout';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .regex(
            /^[a-z0-9.-]+\.\d{9}@student\.itera\.ac\.id$/,
            'Email must follow the format firstname.nim@student.itera.ac.id',
        ),
});

export default function ForgotPassword({ status }) {
    const [statusToastOpen, setStatusToastOpen] = useState(Boolean(status));

    useEffect(() => {
        if (status) {
            setStatusToastOpen(true);
        }
    }, [status]);

    const { data, setData, post, processing, errors, setError, clearErrors } =
        useForm({
            email: '',
        });

    const handleFieldChange = (field, value) => {
        setData(field, value);

        const result = forgotPasswordSchema.shape[field].safeParse(value);

        if (result.success) {
            clearErrors(field);
        } else {
            setError(field, result.error.issues[0].message);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const result = forgotPasswordSchema.safeParse(data);

        if (!result.success) {
            setError('email', result.error.issues[0].message);
            return;
        }

        clearErrors();
        post('/forgot-password');
    };

    return (
        <>
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
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    required
                />

                <Button fullWidth loading={processing}>
                    Send Reset Link
                </Button>

                <AuthFooter
                    message="Remember your password?"
                    href="/login"
                    linkLabel="Sign In"
                />
            </Form.Root>

            <Toast
                open={statusToastOpen}
                onOpenChange={setStatusToastOpen}
                title="Reset Link Sent"
                description={status}
                type="success"
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
