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
import { majorDepartementOptionsFor } from './majorDepartementOptions';
import { staffEmailDomainsFor } from './staffEmailDomains';

/**
 * Register form schema composition.
 *
 * The academic status decides which rules apply: mahasiswa use the
 * student email format and a 9-digit NIM; dosen/staff use the unit
 * domain whitelist and an 18-digit NIP. The refines are guarded by
 * `isMahasiswa` internally (see zodRules.js) so all five are attached
 * for both statuses and only the relevant ones evaluate.
 */
export const buildRegisterSchema = ({ isMahasiswa, majorDepartements }) => {
    const majorDepartementOptions = majorDepartementOptionsFor(
        isMahasiswa,
        majorDepartements,
    );
    const staffEmailDomains = staffEmailDomainsFor(majorDepartements);

    return z
        .object({
            name: nameRule,
            email: isMahasiswa
                ? emailMahasiswaRule
                : emailStaffRule(staffEmailDomains),
            academic_status: z.enum(['Mahasiswa', 'Dosen', 'Staff']),
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
};
