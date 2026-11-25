import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Mail, Lock, Check } from 'lucide-react';
import { Form, Checkbox } from 'radix-ui';
import EmailField from '@/components/EmailField';
import PasswordField from '@/components/PasswordField';
import Button from '@/components/Button';
import AuthFooter from '@/components/AuthFooter';
import Toast from '@/components/Toast';
import AuthLayout from '@/layout/AuthLayout';
import { loginSchema } from './loginSchema';
import { toastFrom } from './authToast';

export default function Login({ status, canResetPassword }) {
    const { error } = usePage().props;

    const [toast, setToast] = useState({
        open: false,
        type: 'success',
        title: '',
        description: '',
    });

    useEffect(() => {
        const nextToast = toastFrom(error, status);

        if (!nextToast) {
            return;
        }

        setToast(nextToast);
    }, [status, error]);

    const [isPending, setIsPending] = useState(false);

    const {
        control,
        handleSubmit,
        clearErrors,
        setError,
        resetField,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
        defaultValues: {
            email: '',
            password: '',
            remember: false,
        },
    });

    const onValid = (values) => {
        if (isPending) {
            return;
        }

        router.post('/login', values, {
            onStart: () => setIsPending(true),
            onFinish: () => {
                setIsPending(false);
                resetField('password', { keepError: true });
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
                <a
                    href="/auth/google/redirect"
                    className="flex w-full items-center justify-center gap-2.5 rounded-full border border-neutral-200 bg-neutral-50 py-3 no-underline shadow-sm transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50/50 hover:shadow active:scale-[0.98]"
                >
                    <img
                        src="/images/google-icon.svg"
                        alt="Google"
                        className="size-4"
                    />
                    <span className="font-inter text-body-sm font-bold whitespace-nowrap text-neutral-700">
                        Continue with Google
                    </span>
                </a>

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
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            required
                        />
                    )}
                />

                <div className="flex items-center justify-between p-1">
                    <div className="group flex items-center gap-2">
                        <Controller
                            control={control}
                            name="remember"
                            render={({ field }) => (
                                <Checkbox.Root
                                    id="remember"
                                    checked={Boolean(field.value)}
                                    onCheckedChange={(checked) =>
                                        field.onChange(Boolean(checked))
                                    }
                                    onBlur={field.onBlur}
                                    className="bg-primary-50 hover:border-primary-700/40 focus-visible:ring-primary-700/20 data-[state=checked]:border-primary-700 data-[state=checked]:bg-primary-700 flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-neutral-200 transition-all duration-200 outline-none hover:bg-neutral-50 focus-visible:ring-2 active:scale-95"
                                >
                                    <Checkbox.Indicator className="flex items-center justify-center">
                                        <Check
                                            className="size-3 text-neutral-50"
                                            strokeWidth={3.5}
                                        />
                                    </Checkbox.Indicator>
                                </Checkbox.Root>
                            )}
                        />
                        <label
                            htmlFor="remember"
                            className="font-inter text-body-sm cursor-pointer text-neutral-500 transition-colors duration-200 select-none group-hover:text-neutral-900"
                        >
                            Remember Me
                        </label>
                    </div>

                    {canResetPassword && (
                        <Link
                            href="/forgot-password"
                            className="font-inter text-primary-700 text-body-sm hover:text-primary-800 font-semibold whitespace-nowrap transition-colors duration-200"
                        >
                            Forgot Your Password?
                        </Link>
                    )}
                </div>

                <Button as="submit" fullWidth loading={isPending}>
                    Sign In
                </Button>

                <AuthFooter
                    message="Don't have an account?"
                    href="/register"
                    linkLabel="Sign Up"
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

Login.layout = [
    AuthLayout,
    {
        icon: LogIn,
        title: 'Welcome Back',
        subtitle: 'Sign in to continue your learning journey',
    },
];
