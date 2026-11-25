import { z } from 'zod';

const nameRule = z
    .string()
    .trim()
    .min(1, 'Nama is required')
    .max(255, 'Name is too long');

const emailMahasiswaRule = z
    .string()
    .regex(
        /^[a-z0-9.-]+\.\d{9}@student\.itera\.ac\.id$/,
        'Email must follow the format firstname.nim@student.itera.ac.id',
    );

const emailStaffRule = (staffEmailDomains) =>
    z
        .string()
        .regex(
            new RegExp(
                `^[a-z0-9.-]+@(?:${staffEmailDomains
                    .map((domain) => domain.replace(/\./g, '\\.'))
                    .join('|')})$`,
            ),
            'Email must follow the format name@itera.ac.id or a valid unit domain',
        );

// Local part is lowercase-only, mirroring the registration rules:
// emails in this system must be lowercase.
const emailLoginRule = z
    .string()
    .regex(
        /^[a-z0-9.-]+@(?:[a-z0-9-]+\.)*itera\.ac\.id$/,
        'Email must be an ITERA domain email',
    );

const nimRule = z.string().regex(/^\d{9}$/, 'NIM must be exactly 9 digits');

const nipRule = z.string().regex(/^\d{18}$/, 'NIP must be exactly 18 digits');

const majorDepartementRule = (majorDepartementOptions) =>
    z.enum(majorDepartementOptions, {
        error: 'Select a valid program studi',
    });

const passwordRule = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/\d/, 'Password must contain a number');

const passwordConfirmationRule = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/\d/, 'Password must contain a number');

const passwordLoginRule = z.string().min(1, 'Password is required');

const nameRefine = ({ isMahasiswa }) => [
    (data) => {
        if (!isMahasiswa) {
            return true;
        }

        const nameFirstName = data.name.trim().split(/\s+/)[0].toLowerCase();
        const emailFirstName = data.email.split('@')[0].split('.')[0];

        return nameFirstName === emailFirstName;
    },
    {
        message: 'First name must match the first name in your email',
        path: ['name'],
    },
];

const nimRefine = ({ isMahasiswa }) => [
    (data) =>
        !isMahasiswa ||
        data.email.endsWith(`.${data.nim_nip}@student.itera.ac.id`),
    {
        message: 'NIM must match the NIM in your email',
        path: ['nim_nip'],
    },
];

const prodiMahasiswaRefine = ({
    isMahasiswa,
    majorDepartements,
    field = 'major_departement',
}) => [
    (data) => {
        if (!isMahasiswa) {
            return true;
        }

        const selected = majorDepartements.find(
            (md) => md.name === data[field],
        );

        return (
            Boolean(selected) &&
            selected.major_departement_code === Number(data.nim_nip.slice(3, 5))
        );
    },
    {
        message: 'Selected Program Studi does not match your NIM',
        path: [field],
    },
];

const departementStaffRefine = ({
    isMahasiswa,
    majorDepartements,
    field = 'major_departement',
}) => [
    (data) => {
        if (isMahasiswa) {
            return true;
        }

        const selected = majorDepartements.find(
            (md) => md.name === data[field],
        );

        return (
            Boolean(selected) &&
            data.email.endsWith(`@${selected.major_departement_domain}`)
        );
    },
    {
        message:
            'Selected Program Studi / UPA does not match your email domain',
        path: [field],
    },
];

const passwordRefine = [
    (data) => data.password === data.password_confirmation,
    {
        message: 'Passwords do not match',
        path: ['password_confirmation'],
    },
];

export {
    emailMahasiswaRule,
    emailStaffRule,
    emailLoginRule,
    nameRule,
    nimRule,
    nipRule,
    majorDepartementRule,
    passwordRule,
    passwordConfirmationRule,
    passwordLoginRule,
    nameRefine,
    nimRefine,
    prodiMahasiswaRefine,
    departementStaffRefine,
    passwordRefine,
};
