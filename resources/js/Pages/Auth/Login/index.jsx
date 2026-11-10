import { useState, useEffect } from 'react';
import { useForm, Link, usePage } from '@inertiajs/react';
import { LogIn, Mail, Lock, Check } from 'lucide-react';
import { Form, Checkbox } from 'radix-ui';
import EmailField from '@/components/EmailField';
import PasswordField from '@/components/PasswordField';
import Button from '@/components/Button';
import AuthFooter from '@/components/AuthFooter';
import Toast from '@/components/Toast';
import AuthLayout from '@/layout/AuthLayout';
import { z } from 'zod';

const loginSchema = z.object({
    email: z
        .string()
        .regex(
            /@(?:[a-z0-9-]+\.)*itera\.ac\.id$/,
            'Email must be an ITERA domain email',
        ),
    password: z.string().min(1, 'Password is required'),
    remember: z.boolean(),
});

export default function Login({ status, canResetPassword }) {
    const { error } = usePage().props;

    const [statusToastOpen, setStatusToastOpen] = useState(Boolean(status));
    const [errorToastOpen, setErrorToastOpen] = useState(Boolean(error));
    const [errorToastMessage, setErrorToastMessage] = useState(error);

    useEffect(() => {
        if (status) {
            setStatusToastOpen(true);
        }
    }, [status]);

    useEffect(() => {
        if (error) {
            setErrorToastMessage(error);
            setErrorToastOpen(true);
        }
    }, [error]);

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
        email: '',
        password: '',
        remember: false,
    });

    const handleFieldChange = (field, value) => {
        setData(field, value);

        const result = loginSchema.shape[field].safeParse(value);

        if (result.success) {
            clearErrors(field);
        } else {
            setError(field, result.error.issues[0].message);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const result = loginSchema.safeParse(data);

        if (!result.success) {
            const fieldErrors = {};
            for (const issue of result.error.issues) {
                if (!fieldErrors[issue.path[0]]) {
                    fieldErrors[issue.path[0]] = issue.message;
                }
            }
            setError(fieldErrors);
            return;
        }

        clearErrors();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Form.Root
                className="flex w-full flex-col gap-5"
                onSubmit={handleSubmit}
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

                <PasswordField
                    name="password"
                    label="Password"
                    icon={Lock}
                    value={data.password}
                    errorMessage={errors.password}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    onChange={(e) =>
                        handleFieldChange('password', e.target.value)
                    }
                    required
                />

                <div className="flex items-center justify-between p-1">
                    <div className="group flex items-center gap-2">
                        <Checkbox.Root
                            id="remember"
                            checked={data.remember}
                            onCheckedChange={(checked) =>
                                setData('remember', Boolean(checked))
                            }
                            className="bg-primary-50 hover:border-primary-700/40 focus-visible:ring-primary-700/20 data-[state=checked]:border-primary-700 data-[state=checked]:bg-primary-700 flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-neutral-200 transition-all duration-200 outline-none hover:bg-neutral-50 focus-visible:ring-2 active:scale-95"
                        >
                            <Checkbox.Indicator className="flex items-center justify-center">
                                <Check
                                    className="size-3 text-neutral-50"
                                    strokeWidth={3.5}
                                />
                            </Checkbox.Indicator>
                        </Checkbox.Root>
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

                <Button as="submit" fullWidth loading={processing}>
                    Sign In
                </Button>

                <AuthFooter
                    message="Don't have an account?"
                    href="/register"
                    linkLabel="Sign Up"
                />
            </Form.Root>

            <Toast
                open={statusToastOpen}
                onOpenChange={setStatusToastOpen}
                title="Success"
                description={status}
                type="success"
            />

            <Toast
                open={errorToastOpen}
                onOpenChange={setErrorToastOpen}
                title="Sign In Failed"
                description={errorToastMessage}
                type="error"
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
