import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    User,
    Mail,
    Hash,
    University,
    Lock,
    GraduationCap,
} from 'lucide-react';
import { Form } from 'radix-ui';
import TextField from '@/components/TextField';
import EmailField from '@/components/EmailField';
import NumberField from '@/components/NumberField';
import AuthLayout from '@/layout/AuthLayout';
import SelectField from '@/components/SelectField';
import PasswordField from '@/components/PasswordField';
import Button from '@/components/Button';
import AuthFooter from '@/components/AuthFooter';
import { majorDepartementOptionsFor } from './majorDepartementOptions';
import { buildRegisterSchema } from './registerSchema';
import { shouldResetIdentityFields } from './resetIdentityFields';

export default function Register({ majorDepartements }) {
    const [isPending, setIsPending] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
        clearErrors,
        setError,
        resetField,
        getValues,
        trigger,
        formState: { errors },
    } = useForm({
        resolver: (values, context, options) =>
            zodResolver(registerSchema)(values, context, options),
        mode: 'onChange',
        defaultValues: {
            name: '',
            email: '',
            academic_status: 'Mahasiswa',
            nim_nip: '',
            major_departement: '',
            password: '',
            password_confirmation: '',
        },
    });

    // ── Academic status selection ──────────────────────────────
    const isMahasiswa = watch('academic_status') === 'Mahasiswa';

    // ── Dropdown options for the current status ────────────────
    const majorDepartementOptions = majorDepartementOptionsFor(
        isMahasiswa,
        majorDepartements,
    );

    const registerSchema = buildRegisterSchema({
        isMahasiswa,
        majorDepartements,
    });

    useEffect(() => {
        if (getValues('email')) {
            trigger('email');
        }
    }, [isMahasiswa, getValues, trigger]);

    const handleStatusChange = (nextStatus, fieldOnChange) => {
        const previousStatus = getValues('academic_status');

        fieldOnChange(nextStatus);

        if (shouldResetIdentityFields(previousStatus, nextStatus)) {
            resetField('nim_nip');
            resetField('major_departement');
        }
    };

    const onValid = (values) => {
        if (isPending) {
            return;
        }

        router.post('/register', values, {
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
        <>
            <Form.Root
                className="flex w-full flex-col gap-5"
                onSubmit={handleSubmit(onValid)}
                noValidate
            >
                <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                        <TextField
                            name="name"
                            label="Nama"
                            type="text"
                            icon={User}
                            value={field.value ?? ''}
                            errorMessage={errors.name?.message}
                            autoComplete="name"
                            placeholder="Alvin Yoga Kesuma"
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            required
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="academic_status"
                    render={({ field }) => (
                        <SelectField
                            name="academic_status"
                            label="Status Akademik"
                            options={['Mahasiswa', 'Dosen', 'Staff']}
                            icon={GraduationCap}
                            value={field.value ?? ''}
                            errorMessage={errors.academic_status?.message}
                            autoComplete="off"
                            onValueChange={(value) =>
                                handleStatusChange(value, field.onChange)
                            }
                            required
                        />
                    )}
                />
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
                    name="nim_nip"
                    render={({ field }) => (
                        <NumberField
                            name="nim_nip"
                            label={isMahasiswa ? 'NIM' : 'NIP'}
                            type="number"
                            icon={Hash}
                            value={field.value ?? ''}
                            errorMessage={errors.nim_nip?.message}
                            autoComplete="off"
                            placeholder={
                                isMahasiswa ? '121140154' : '198504122010011001'
                            }
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            required
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="major_departement"
                    render={({ field }) => (
                        <SelectField
                            name="major_departement"
                            label={
                                isMahasiswa
                                    ? 'Program Studi'
                                    : 'Program Studi / UPA'
                            }
                            options={majorDepartementOptions}
                            icon={University}
                            value={field.value ?? ''}
                            errorMessage={errors.major_departement?.message}
                            autoComplete="off"
                            placeholder={
                                isMahasiswa
                                    ? 'Teknik Informatika'
                                    : 'UPA TIK / Teknik Informatika'
                            }
                            onValueChange={field.onChange}
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
                    Sign Up
                </Button>

                <AuthFooter
                    message="Already have an account?"
                    href="/login"
                    linkLabel="Sign In"
                />
            </Form.Root>
        </>
    );
}

Register.layout = [
    AuthLayout,
    {
        icon: User,
        title: 'Create Account',
        subtitle: 'Begin your learning adventure today',
    },
];
