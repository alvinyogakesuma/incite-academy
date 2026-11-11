import { useForm } from '@inertiajs/react';
import { useState } from 'react';
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
import zodFieldErrors from '@/utils/zodFieldErrors';
import { z } from 'zod';
import {
    emailMahasiswaRule,
    emailStaffRule,
    nameRule,
    nimRule,
    nipRule,
    majorDepartementRule,
    passwordRule,
    passwordConfirmationRule,
    nameRefine,
    nimRefine,
    prodiMahasiswaRefine,
    departementStaffRefine,
    passwordRefine,
} from '@/utils/zodRules.js';

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

    // ── Academic status selection ──────────────────────────────
    const [statusAkademik, setStatusAkademik] = useState('Mahasiswa');

    const isMahasiswa = statusAkademik === 'Mahasiswa';

    // ── Dropdown options for the current status ────────────────
    const majorDepartementOptions = isMahasiswa
        ? majorDepartements
              .filter((md) => md.major_departement_code !== null)
              .map((md) => md.name) // mahasiswa: the 42 majors
        : majorDepartements.map((md) => md.name); // dosen/staff: whole list

    const staffEmailDomains = [
        ...new Set([
            'itera.ac.id',
            ...majorDepartements.map((md) => md.major_departement_domain),
        ]),
    ];

    const registerSchema = z
        .object({
            name: nameRule,
            email: isMahasiswa
                ? emailMahasiswaRule
                : emailStaffRule(staffEmailDomains),
            nim_nip: isMahasiswa ? nimRule : nipRule,
            major_departement: majorDepartementRule(majorDepartementOptions),
            password: passwordRule,
            password_confirmation: passwordConfirmationRule,
        })
        .refine(...nameRefine({ isMahasiswa }))
        .refine(...nimRefine({ isMahasiswa }))
        .refine(...prodiMahasiswaRefine({ isMahasiswa, majorDepartements }))
        .refine(...departementStaffRefine({ isMahasiswa, majorDepartements }))
        .refine(...passwordRefine);

    const handleStatusChange = (value) => {
        const wasMahasiswa = statusAkademik === 'Mahasiswa';

        setStatusAkademik(value);

        if (wasMahasiswa !== (value === 'Mahasiswa')) {
            setData('nim_nip', '');
            setData('major_departement', '');
            clearErrors('nim_nip', 'major_departement');
        }
    };

    const handleFieldChange = (field, value) => {
        setData(field, value);

        const result = registerSchema.shape[field].safeParse(value);

        if (result.success) {
            clearErrors(field);
        } else {
            setError(field, result.error.issues[0].message);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const result = registerSchema.safeParse(data);

        if (!result.success) {
            clearErrors();
            setError(zodFieldErrors(result.error));
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
                <SelectField
                    name="status_akademik"
                    label="Status Akademik"
                    options={['Mahasiswa', 'Dosen', 'Staff']}
                    icon={GraduationCap}
                    value={statusAkademik}
                    autoComplete="off"
                    onValueChange={handleStatusChange}
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
                    label={isMahasiswa ? 'NIM' : 'NIP'}
                    type="number"
                    icon={Hash}
                    value={data.nim_nip}
                    errorMessage={errors.nim_nip}
                    autoComplete="off"
                    placeholder={
                        isMahasiswa ? '121140154' : '198504122010011001'
                    }
                    onChange={(e) =>
                        handleFieldChange('nim_nip', e.target.value)
                    }
                    required
                />
                <SelectField
                    name="major_departement"
                    label={
                        isMahasiswa ? 'Program Studi' : 'Program Studi / UPA'
                    }
                    options={majorDepartementOptions}
                    icon={University}
                    value={data.major_departement}
                    errorMessage={errors.major_departement}
                    autoComplete="off"
                    placeholder={
                        isMahasiswa
                            ? 'Teknik Informatika'
                            : 'UPA TIK / Teknik Informatika'
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
                        handleFieldChange('password', e.target.value)
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
                        handleFieldChange(
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
