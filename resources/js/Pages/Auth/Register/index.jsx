import { useForm } from '@inertiajs/react';
import { useRef } from 'react';
import { User, Mail, Hash, University, Lock } from 'lucide-react';
import { Form } from 'radix-ui';
import TextField from '@/components/TextField';
import EmailField from '@/components/EmailField';
import NumberField from '@/components/NumberField';
import AuthLayout from '@/layout/AuthLayout';
import SelectField from '@/components/SelectField';
import PasswordField from '@/components/PasswordField';
import Button from '@/components/Button';
import AuthFooter from '@/components/AuthFooter';
import { z } from 'zod';

export default function Register({ majorDepartements }) {
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
        name: '',
        email: '',
        nim_nip: '',
        major_departement: '',
        password: '',
        password_confirmation: '',
    });

    // ── Role switching ─────────────────────────────────────────
    const lastDistinctChange = useRef(false);

    const emailDomain = data.email.split('@')[1] ?? '';

    const isStaff =
        emailDomain === 'itera.ac.id' ||
        majorDepartements.some(
            (md) => md.major_departement_domain === emailDomain,
        );

    if (isStaff !== lastDistinctChange.current) {
        lastDistinctChange.current = isStaff;
        setData('nim_nip', '');
        setData('major_departement', '');
        clearErrors('nim_nip', 'major_departement');
    }

    // ── Dropdown options for the current role ──────────────────
    const majorDepartementOptions = isStaff
        ? majorDepartements.map((md) => md.name) // lecturer: whole list
        : majorDepartements
              .filter((md) => md.major_departement_code !== null)
              .map((md) => md.name); // student: the 42 majors

    const registerSchema = z
        .object({
            name: z
                .string()
                .trim()
                .min(1, 'Nama is required')
                .max(255, 'Name is too long'),
            email: z
                .string()
                .regex(
                    /@(?:[a-z0-9-]+\.)*itera\.ac\.id$/,
                    'Email must be an ITERA domain email',
                ),
            nim_nip: !isStaff
                ? z.string().regex(/^\d{9}$/, 'NIM must be exactly 9 digits')
                : z.string().regex(/^\d{18}$/, 'NIP must be exactly 18 digits'),
            major_departement: z.enum(majorDepartementOptions, {
                error: 'Select a valid program studi',
            }),
            password: z
                .string()
                .min(8, 'Password must be at least 8 characters')
                .regex(/[A-Z]/, 'Password must contain an uppercase letter')
                .regex(/[a-z]/, 'Password must contain a lowercase letter')
                .regex(/\d/, 'Password must contain a number'),
            password_confirmation: z.string(),
        })
        .refine((data) => data.password === data.password_confirmation, {
            message: 'Passwords do not match',
            path: ['password_confirmation'],
        })
        .refine(
            (data) =>
                isStaff ||
                data.email.endsWith(`.${data.nim_nip}@student.itera.ac.id`),
            {
                message: 'NIM must match the NIM in your email',
                path: ['nim_nip'],
            },
        )
        .refine(
            (data) => {
                if (isStaff) {
                    return true;
                }

                const selected = majorDepartements.find(
                    (md) => md.name === data.major_departement,
                );

                return (
                    Boolean(selected) &&
                    selected.major_departement_code ===
                        Number(data.nim_nip.slice(3, 5))
                );
            },
            {
                message: 'Selected Program Studi does not match your NIM',
                path: ['major_departement'],
            },
        );

    const handleFieldChange = (field, value) => {
        setData(field, value);

        const result = registerSchema.shape[field].safeParse(value);

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

        const result = registerSchema.safeParse(data);

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
        post('/register', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Form.Root
                className="flex w-full flex-col gap-5"
                onSubmit={handleSubmit}
                noValidate
            >
                <TextField
                    name="name"
                    label="Nama"
                    type="text"
                    icon={User}
                    value={data.name}
                    errorMessage={errors.name}
                    autoComplete="name"
                    placeholder="Alvin Yoga Kesuma"
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                />
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
                <NumberField
                    name="nim_nip"
                    label={isStaff ? 'NIP' : 'NIM'}
                    type="number"
                    icon={Hash}
                    value={data.nim_nip}
                    errorMessage={errors.nim_nip}
                    autoComplete="off"
                    placeholder={isStaff ? '198504122010011001' : '121140154'}
                    onChange={(e) =>
                        handleFieldChange('nim_nip', e.target.value)
                    }
                    required
                />
                <SelectField
                    name="major_departement"
                    label={isStaff ? 'Program Studi / UPA' : 'Program Studi'}
                    options={majorDepartementOptions}
                    icon={University}
                    value={data.major_departement}
                    errorMessage={errors.major_departement}
                    autoComplete="off"
                    placeholder={
                        isStaff
                            ? 'UPA TIK / Teknik Informatika'
                            : 'Teknik Informatika'
                    }
                    onValueChange={(value) =>
                        handleFieldChange('major_departement', value)
                    }
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
