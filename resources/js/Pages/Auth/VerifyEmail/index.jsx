import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { MailCheck } from 'lucide-react';
import { Form } from 'radix-ui';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import AuthFooter from '@/components/AuthFooter';
import AuthLayout from '@/layout/AuthLayout';

export default function VerifyEmail({ status }) {
    const [toast, setToast] = useState({
        open: false,
        type: 'success',
        title: 'Verification Link Sent',
        description:
            'A new verification link has been sent to the email address you provided during registration.',
    });

    useEffect(() => {
        if (!status) {
            return;
        }

        setToast((prev) => ({ ...prev, open: true }));
    }, [status]);

    const [isPending, setIsPending] = useState(false);
    const { handleSubmit } = useForm();

    const onValid = () => {
        if (isPending) {
            return;
        }

        router.post(
            '/email/verification-notification',
            {},
            {
                onStart: () => setIsPending(true),
                onFinish: () => setIsPending(false),
                onSuccess: () => {
                    setToast((prev) => ({ ...prev, open: true }));
                },
            },
        );
    };

    return (
        <>
            <Form.Root
                className="flex w-full flex-col gap-5"
                onSubmit={handleSubmit(onValid)}
                noValidate
            >
                <Button as="submit" fullWidth loading={isPending}>
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
                open={toast.open}
                onOpenChange={(open) => setToast((prev) => ({ ...prev, open }))}
                title={toast.title}
                description={toast.description}
                type={toast.type}
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
