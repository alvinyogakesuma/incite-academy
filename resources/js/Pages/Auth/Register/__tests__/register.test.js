/**
 * Register feature tests.
 *
 * Covers the pieces `Register/index.jsx` depends on beyond the chain
 * rules: the five zod refinements (decision coverage — the only code in
 * the module with real branches) and `zodFieldErrors` (error-bag
 * mapping).
 *
 * Principle: one test case per decision/branch. Each case exercises a
 * single outcome of a single decision point.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
    nameRefine,
    nimRefine,
    prodiMahasiswaRefine,
    departementStaffRefine,
    passwordRefine,
} from '@/utils/zodRules.js';
import zodFieldErrors from '@/utils/zodFieldErrors';

/*
 * Decision inventory (branch coverage targets):
 * D1  nameRefine            !isMahasiswa guard          (true / false)
 * D2  prodiMahasiswaRefine  !isMahasiswa guard          (true / false)
 * D3  departementStaffRefine isMahasiswa guard          (true / false)
 * D4  nimRefine             !isMahasiswa || short-circuit
 *                           (left true / left false + right true /
 *                            left false + right false)
 * D5  prodiMahasiswaRefine  Boolean(selected) && chain  (null / match / mismatch)
 * D6  departementStaffRefine Boolean(selected) && chain (null / match / mismatch)
 * D7  passwordRefine        equality check              (equal / not equal)
 * D8  nameRefine            ?? '' nullish fallbacks     (fallback / defined)
 * D9  zodFieldErrors        if (!fieldErrors[path[0]])  (skip / set)
 */

/** Fixtures shared by the refine suites. */
const majorDepartements = [
    {
        name: 'Teknik Informatika',
        major_departement_code: 3,
        major_departement_domain: 'tik.itera.ac.id',
    },
    {
        name: 'Teknik Elektro',
        major_departement_code: 2,
        major_departement_domain: 'elektro.itera.ac.id',
    },
    {
        name: 'UPA TIK',
        major_departement_code: null,
        major_departement_domain: 'upa.itera.ac.id',
    },
];

describe('nameRefine', () => {
    const refine = nameRefine({ isMahasiswa: true });

    it('is a [validation, config] tuple for the .refine(...spread) contract', () => {
        expect(refine).toHaveLength(2);
        expect(refine[0]).toBeTypeOf('function');
        expect(refine[1]).toBeTypeOf('object');
    });

    it('D1 false — checks the name when mahasiswa', () => {
        expect(
            refine[0]({
                name: 'Alvin Yoga',
                email: 'alvin.121140154@student.itera.ac.id',
            }),
        ).toBe(true);
    });

    it('D1 true — bypasses staff', () => {
        const staff = nameRefine({ isMahasiswa: false });
        expect(staff[0]({ name: 'Anyone', email: 'budi@itera.ac.id' })).toBe(
            true,
        );
    });

    it('is case-insensitive on the first name', () => {
        expect(
            refine[0]({
                name: 'ALVIN Yoga',
                email: 'alvin.121140154@student.itera.ac.id',
            }),
        ).toBe(true);
    });

    it('D8 fallback — blank name yields empty string and fails', () => {
        expect(
            refine[0]({
                name: '   ',
                email: 'alvin.121140154@student.itera.ac.id',
            }),
        ).toBe(false);
    });

    it('D8 fallback — email without a local part yields empty string and fails', () => {
        expect(
            refine[0]({
                name: 'Alvin',
                email: '@student.itera.ac.id',
            }),
        ).toBe(false);
    });

    it('rejects a mismatched first name', () => {
        expect(
            refine[0]({
                name: 'Budi Santoso',
                email: 'alvin.121140154@student.itera.ac.id',
            }),
        ).toBe(false);
    });

    it('carries message and path for the name field', () => {
        expect(refine[1].message).toBe(
            'First name must match the first name in your email',
        );
        expect(refine[1].path).toEqual(['name']);
    });

    it('spreads into zod and routes the issue to the name field', () => {
        const schema = z
            .object({ name: z.string(), email: z.string() })
            .refine(...refine);

        const result = schema.safeParse({
            name: 'Budi',
            email: 'alvin.121140154@student.itera.ac.id',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['name']);
        expect(result.error.issues[0].message).toBe(
            'First name must match the first name in your email',
        );
    });
});

describe('nimRefine', () => {
    const refine = nimRefine({ isMahasiswa: true });

    it('is a [validation, config] tuple for the .refine(...spread) contract', () => {
        expect(refine).toHaveLength(2);
        expect(refine[0]).toBeTypeOf('function');
        expect(refine[1]).toBeTypeOf('object');
    });

    it('D4 right true — email ends with .NIM@student.itera.ac.id', () => {
        expect(
            refine[0]({
                email: 'alvin.121140154@student.itera.ac.id',
                nim_nip: '121140154',
            }),
        ).toBe(true);
    });

    it('D4 right false — mismatched NIM fails', () => {
        expect(
            refine[0]({
                email: 'alvin.121140155@student.itera.ac.id',
                nim_nip: '121140154',
            }),
        ).toBe(false);
    });

    it('rejects a NIM that appears but not as the email suffix', () => {
        expect(
            refine[0]({
                email: '121140154.student.itera.ac.id',
                nim_nip: '121140154',
            }),
        ).toBe(false);
    });

    it('D4 left true — bypasses staff regardless of email', () => {
        const staff = nimRefine({ isMahasiswa: false });
        expect(staff[0]({ email: 'budi@itera.ac.id', nim_nip: '' })).toBe(true);
    });

    it('carries message and path for the nim_nip field', () => {
        expect(refine[1].message).toBe('NIM must match the NIM in your email');
        expect(refine[1].path).toEqual(['nim_nip']);
    });

    it('spreads into zod and routes the issue to the nim_nip field', () => {
        const schema = z
            .object({ email: z.string(), nim_nip: z.string() })
            .refine(...refine);

        const result = schema.safeParse({
            email: 'alvin.121140155@student.itera.ac.id',
            nim_nip: '121140154',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['nim_nip']);
        expect(result.error.issues[0].message).toBe(
            'NIM must match the NIM in your email',
        );
    });
});

describe('prodiMahasiswaRefine', () => {
    // NIM digits 4-5 (slice(3, 5)) must equal the prodi code.
    const refine = prodiMahasiswaRefine({
        isMahasiswa: true,
        majorDepartements,
    });

    it('is a [validation, config] tuple for the .refine(...spread) contract', () => {
        expect(refine).toHaveLength(2);
        expect(refine[0]).toBeTypeOf('function');
        expect(refine[1]).toBeTypeOf('object');
    });

    it('D5 match — prodi code 3 matches NIM slice 03', () => {
        expect(
            refine[0]({
                major_departement: 'Teknik Informatika',
                nim_nip: '121030154',
            }),
        ).toBe(true);
    });

    it('D5 mismatch — prodi code 2 vs NIM slice 03 fails', () => {
        expect(
            refine[0]({
                major_departement: 'Teknik Elektro',
                nim_nip: '121030154',
            }),
        ).toBe(false);
    });

    it('D5 null — an unknown prodi short-circuits to false', () => {
        expect(
            refine[0]({
                major_departement: 'Kedokteran',
                nim_nip: '121030154',
            }),
        ).toBe(false);
    });

    it('compares the code numerically against zero-padded slices', () => {
        expect(
            refine[0]({
                major_departement: 'Teknik Elektro',
                nim_nip: '121024154',
            }),
        ).toBe(true);
    });

    it('D2 true — bypasses staff', () => {
        const staff = prodiMahasiswaRefine({
            isMahasiswa: false,
            majorDepartements,
        });
        expect(staff[0]({ major_departement: 'Kedokteran', nim_nip: '' })).toBe(
            true,
        );
    });

    it('carries message and path for the major_departement field', () => {
        expect(refine[1].message).toBe(
            'Selected Program Studi does not match your NIM',
        );
        expect(refine[1].path).toEqual(['major_departement']);
    });

    it('spreads into zod and routes the issue to the major_departement field', () => {
        const schema = z
            .object({
                major_departement: z.string(),
                nim_nip: z.string(),
            })
            .refine(...refine);

        const result = schema.safeParse({
            major_departement: 'Teknik Elektro',
            nim_nip: '121030154',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['major_departement']);
        expect(result.error.issues[0].message).toBe(
            'Selected Program Studi does not match your NIM',
        );
    });

    it('supports a custom field name (e.g. major_department)', () => {
        const schema = z
            .object({
                major_department: z.string(),
                nim_nip: z.string(),
            })
            .refine(
                ...prodiMahasiswaRefine({
                    isMahasiswa: true,
                    majorDepartements,
                    field: 'major_department',
                }),
            );

        expect(
            schema.safeParse({
                major_department: 'Teknik Informatika',
                nim_nip: '121030154',
            }).success,
        ).toBe(true);

        const result = schema.safeParse({
            major_department: 'Teknik Elektro',
            nim_nip: '121030154',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['major_department']);
    });
});

describe('departementStaffRefine', () => {
    const refine = departementStaffRefine({
        isMahasiswa: false,
        majorDepartements,
    });

    it('is a [validation, config] tuple for the .refine(...spread) contract', () => {
        expect(refine).toHaveLength(2);
        expect(refine[0]).toBeTypeOf('function');
        expect(refine[1]).toBeTypeOf('object');
    });

    it('D6 match — email ends with the selected unit domain', () => {
        expect(
            refine[0]({
                major_departement: 'Teknik Informatika',
                email: 'budi@tik.itera.ac.id',
            }),
        ).toBe(true);
    });

    it('D6 mismatch — email on a different unit domain fails', () => {
        expect(
            refine[0]({
                major_departement: 'UPA TIK',
                email: 'budi@tik.itera.ac.id',
            }),
        ).toBe(false);
    });

    it('D6 null — an unknown prodi/UPA short-circuits to false', () => {
        expect(
            refine[0]({
                major_departement: 'Kedokteran',
                email: 'budi@tik.itera.ac.id',
            }),
        ).toBe(false);
    });

    it('D3 true — bypasses mahasiswa', () => {
        const mahasiswa = departementStaffRefine({
            isMahasiswa: true,
            majorDepartements,
        });
        expect(
            mahasiswa[0]({
                major_departement: 'Kedokteran',
                email: 'alvin.121140154@student.itera.ac.id',
            }),
        ).toBe(true);
    });

    it('carries message and path for the major_departement field', () => {
        expect(refine[1].message).toBe(
            'Selected Program Studi / UPA does not match your email domain',
        );
        expect(refine[1].path).toEqual(['major_departement']);
    });

    it('spreads into zod and routes the issue to the major_departement field', () => {
        const schema = z
            .object({ major_departement: z.string(), email: z.string() })
            .refine(...refine);

        const result = schema.safeParse({
            major_departement: 'Teknik Informatika',
            email: 'budi@upa.itera.ac.id',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['major_departement']);
        expect(result.error.issues[0].message).toBe(
            'Selected Program Studi / UPA does not match your email domain',
        );
    });

    it('supports a custom field name (e.g. major_department)', () => {
        const schema = z
            .object({
                major_department: z.string(),
                email: z.string(),
            })
            .refine(
                ...departementStaffRefine({
                    isMahasiswa: false,
                    majorDepartements,
                    field: 'major_department',
                }),
            );

        expect(
            schema.safeParse({
                major_department: 'Teknik Informatika',
                email: 'budi@tik.itera.ac.id',
            }).success,
        ).toBe(true);

        const result = schema.safeParse({
            major_department: 'UPA TIK',
            email: 'budi@tik.itera.ac.id',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['major_department']);
    });
});

describe('passwordRefine', () => {
    it('is a [validation, config] tuple for the .refine(...spread) contract', () => {
        expect(passwordRefine).toHaveLength(2);
        expect(passwordRefine[0]).toBeTypeOf('function');
        expect(passwordRefine[1]).toBeTypeOf('object');
    });

    it('D7 equal — matching passwords pass', () => {
        expect(
            passwordRefine[0]({
                password: 'Password123',
                password_confirmation: 'Password123',
            }),
        ).toBe(true);
    });

    it('D7 not equal — mismatched passwords fail', () => {
        expect(
            passwordRefine[0]({
                password: 'Password123',
                password_confirmation: 'Password124',
            }),
        ).toBe(false);
    });

    it('carries message and path for the password_confirmation field', () => {
        expect(passwordRefine[1].message).toBe('Passwords do not match');
        expect(passwordRefine[1].path).toEqual(['password_confirmation']);
    });

    it('spreads into zod and routes the issue to the password_confirmation field', () => {
        const schema = z
            .object({
                password: z.string(),
                password_confirmation: z.string(),
            })
            .refine(...passwordRefine);

        const result = schema.safeParse({
            password: 'Password123',
            password_confirmation: 'Password124',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['password_confirmation']);
        expect(result.error.issues[0].message).toBe('Passwords do not match');
    });
});

describe('zodFieldErrors', () => {
    const schema = z.object({
        name: z.string().min(3, 'Name is too short'),
        email: z.string().email('Email is invalid'),
    });

    it('D9 set — maps one issue per field, keyed by path[0]', () => {
        const result = schema.safeParse({ name: 'ab', email: 'nope' });

        expect(zodFieldErrors(result.error)).toEqual({
            name: 'Name is too short',
            email: 'Email is invalid',
        });
    });

    it('D9 skip — keeps the first issue when a field has several', () => {
        const manyChecks = z.object({
            password: z
                .string()
                .min(8, 'Password must be at least 8 characters')
                .regex(/[A-Z]/, 'Password must contain an uppercase letter'),
        });

        const result = manyChecks.safeParse({ password: 'short' });

        expect(zodFieldErrors(result.error)).toEqual({
            password: 'Password must be at least 8 characters',
        });
    });

    it('maps a refine issue to its configured path', () => {
        const withRefine = z
            .object({
                password: z.string(),
                password_confirmation: z.string(),
            })
            .refine(...passwordRefine);

        const result = withRefine.safeParse({
            password: 'Password123',
            password_confirmation: 'Password124',
        });

        expect(zodFieldErrors(result.error)).toEqual({
            password_confirmation: 'Passwords do not match',
        });
    });

    it('returns an empty object for a ZodError without issues', () => {
        expect(zodFieldErrors(new z.ZodError([]))).toEqual({});
    });
});
