import { z } from 'zod';
import {
    emailMahasiswaRule,
    emailStaffRule,
    nameRule,
    nimRule,
    nipRule,
    majorDepartementRule,
    nameRefine,
    nimRefine,
    prodiMahasiswaRefine,
    departementStaffRefine,
} from '@/utils/zodRules.js';

/**
 * The blank add-user form.
 */
export const EMPTY_FORM = {
    name: '',
    email: '',
    academic_status: 'Mahasiswa',
    role: 'student',
    nim_nip: '',
    major_department: '',
    total_points: 0,
};

/**
 * The form values a dialog opening hydrates — the editing user's
 * fields with fallbacks for anything missing, or the blank form
 * when the dialog opens for adding.
 */
export const initialFormValues = (user) =>
    user
        ? {
              name: user.name ?? '',
              email: user.email ?? '',
              academic_status: user.academic_status ?? 'Mahasiswa',
              role: user.role ?? 'student',
              nim_nip: user.nim_nip ?? '',
              major_department: user.major_department ?? '',
              total_points: user.total_points ?? 0,
          }
        : EMPTY_FORM;

/**
 * The dialog's validation schema — the Register page's rule set
 * minus the password fields, plus the role and points fields only
 * an administrator may edit.
 */
export const buildUserSchema = ({
    isMahasiswa,
    staffEmailDomains,
    majorDepartementOptions,
    majorDepartements,
}) =>
    z
        .object({
            name: nameRule,
            email: isMahasiswa
                ? emailMahasiswaRule
                : emailStaffRule(staffEmailDomains),
            academic_status: z.enum(['Mahasiswa', 'Dosen', 'Staff']),
            role: z.enum(['student', 'admin']),
            nim_nip: isMahasiswa ? nimRule : nipRule,
            major_department: majorDepartementRule(majorDepartementOptions),
            total_points: z
                .number({ error: 'Points must be a positive number' })
                .int('Points must be a whole number')
                .min(0, 'Points must be a positive number'),
        })
        .refine(...nameRefine({ isMahasiswa }))
        .refine(...nimRefine({ isMahasiswa }))
        .refine(
            ...prodiMahasiswaRefine({
                isMahasiswa,
                majorDepartements,
                field: 'major_department',
            }),
        )
        .refine(
            ...departementStaffRefine({
                isMahasiswa,
                majorDepartements,
                field: 'major_department',
            }),
        );

/**
 * Where a valid form goes — the editing user's row gets a PUT, a
 * new user gets a POST.
 */
export const submitUserRequest = (user) =>
    user?.id
        ? { method: 'put', url: `/dashboard/users/${user.id}` }
        : { method: 'post', url: '/dashboard/users' };

/**
 * A submission's server errors as field/message pairs.
 */
export const mapServerErrors = (serverErrors) =>
    Object.entries(serverErrors ?? {});

/**
 * The add/edit dialog's copy — the title and submit label both key
 * off whether a user is being edited.
 */
export const dialogCopy = (isEdit) =>
    isEdit
        ? { title: 'Edit User Information', submitLabel: 'Update User' }
        : { title: 'Add New User', submitLabel: 'Save User' };

/**
 * The points input's onChange coercion. An empty input stays '' so
 * the schema's number rule reports it — coercing to 0 would silently
 * pass .min(0) — anything else becomes a Number.
 */
export const coercePointsInput = (value) => (value === '' ? '' : Number(value));
