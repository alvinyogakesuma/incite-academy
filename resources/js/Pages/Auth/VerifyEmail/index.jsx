import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import { Form } from 'radix-ui';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import AuthFooter from '@/components/AuthFooter';
import AuthLayout from '@/layout/AuthLayout';

export default function VerifyEmail({ status }) {
    const [statusToastOpen, setStatusToastOpen] = useState(Boolean(status));

    useEffect(() => {
        if (status) {
            setStatusToastOpen(true);
        }
    }, [status]);

    const { post, processing } = useForm();

    const resendVerificationLink = (e) => {
        e.preventDefault();
        post('/email/verification-notification');
    };

    return (
        <>
            <Form.Root
                className="flex w-full flex-col gap-5"
                onSubmit={resendVerificationLink}
            >
                <Button as="submit" fullWidth loading={processing}>
                    Resend Verification Email
                </Button>

                <AuthFooter
                    message="Back to Home"
                    href="/logout"
                    linkLabel="Log Out"
                    method="post"
                />
            </Form.Root>

            <Toast
                open={statusToastOpen}
                onOpenChange={setStatusToastOpen}
                title="Verification Link Sent"
                description="A new verification link has been sent to the email address you provided during registration."
                type="success"
            />
        </>
    );
}

VerifyEmail.layout = [
    AuthLayout,
    {
        icon: MailCheck,
        title: 'Verify Email',
        subtitle: 'Confirm your email address to continue',
    },
];
