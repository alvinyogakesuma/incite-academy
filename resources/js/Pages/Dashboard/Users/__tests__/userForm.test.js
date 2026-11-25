/**
 * User form dialog logic tests.
 *
 * Covers every decision in userForm.js (the React glue — dialog
 * open guards, pending gate, router dispatch — stays in the
 * component; the dropdown/domain/status-reset helpers are
 * Register's, already covered by their own suites):
 *
 *  EMPTY_FORM
 *   D1  the blank add-user shape
 *
 *  initialFormValues
 *   D2  no user → the blank form
 *   D3  a full user → every field copied over
 *   D4  a bare user object → all seven nullish fallbacks
 *
 *  buildUserSchema
 *   D5  Mahasiswa arm: a consistent student passes
 *   D6  staff arm: a consistent Dosen passes
 *   D7  email rule split — student schema rejects a staff
 *       email / staff schema rejects a student email
 *   D8  nim/nip rule split — student schema rejects an 18-digit
 *       NIP / staff schema rejects a 9-digit NIM
 *   D9  points — negative trips min / 1.5 trips int / '' trips
 *       the number type
 *   D10 role enum rejects anything but student/admin
 *   D11 academic_status enum rejects anything but the three
 *   D12 nameRefine — first name must match the email's
 *   D13 nimRefine — NIM must match the email's
 *   D14 prodiMahasiswaRefine — program studi must match the
 *       NIM's prodi digits
 *   D15 departementStaffRefine — unit must match the email's
 *       domain
 *
 *  submitUserRequest
 *   D16 user with id → PUT /dashboard/users/{id}
 *   D17 null user → POST /dashboard/users        (?. null arm)
 *   D18 user without id → POST                   (?. missing-key arm)
 *
 *  mapServerErrors
 *   D19 null → no pairs                          (?? fallback arm)
 *   D20 an error bag → field/message pairs
 *   D21 an empty bag → no pairs
 *
 *  dialogCopy
 *   D22 edit → Edit User Information / Update User,
 *       add → Add New User / Save User
 *
 *  coercePointsInput
 *   D23 '' stays '' (the number rule reports it),
 *       anything else becomes a Number
 */
import { describe, expect, it } from 'vitest';
import { majorDepartementOptionsFor } from '@/Pages/Auth/Register/majorDepartementOptions';
import { staffEmailDomainsFor } from '@/Pages/Auth/Register/staffEmailDomains';
import {
    EMPTY_FORM,
    buildUserSchema,
    coercePointsInput,
    dialogCopy,
    initialFormValues,
    mapServerErrors,
    submitUserRequest,
} from '../userForm';

const MAJORS = [
    {
        name: 'Teknik Informatika',
        major_departement_code: 14,
        major_departement_domain: 'if.itera.ac.id',
    },
    {
        name: 'Teknik Kimia',
        major_departement_code: 62,
        major_departement_domain: 'tk.itera.ac.id',
    },
    {
        name: 'UPA TIK',
        major_departement_code: null,
        major_departement_domain: 'upt-tik.itera.ac.id',
    },
];

const schemaFor = (isMahasiswa) =>
    buildUserSchema({
        isMahasiswa,
        staffEmailDomains: staffEmailDomainsFor(MAJORS),
        majorDepartementOptions: majorDepartementOptionsFor(
            isMahasiswa,
            MAJORS,
        ),
        majorDepartements: MAJORS,
    });

// Every field agrees with every rule: the name matches the email's
// first segment, the email carries the NIM, and the NIM's prodi
// digits (slice 3..5 = "14") match the selected program studi.
const mahasiswaValues = {
    name: 'Alvin Pratama',
    email: 'alvin.121140154@student.itera.ac.id',
    academic_status: 'Mahasiswa',
    role: 'student',
    nim_nip: '121140154',
    major_department: 'Teknik Informatika',
    total_points: 0,
};

// The Dosen's email lands on the selected unit's domain, the NIP
// is 18 digits, and points are positive.
const staffValues = {
    name: 'Budi Santos',
    email: 'budi@upt-tik.itera.ac.id',
    academic_status: 'Dosen',
    role: 'admin',
    nim_nip: '198504122010011001',
    major_department: 'UPA TIK',
    total_points: 250,
};

const parseFailure = (schema, values, expectedPath, expectedMessage) => {
    const result = schema.safeParse(values);

    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(expectedPath);

    if (expectedMessage) {
        expect(result.error.issues[0].message).toBe(expectedMessage);
    }
};

describe('EMPTY_FORM', () => {
    it('D1: is the blank add-user shape', () => {
        expect(EMPTY_FORM).toEqual({
            name: '',
            email: '',
            academic_status: 'Mahasiswa',
            role: 'student',
            nim_nip: '',
            major_department: '',
            total_points: 0,
        });
    });
});

describe('initialFormValues', () => {
    it('D2: hydrates the blank form when no user is being edited', () => {
        expect(initialFormValues(null)).toEqual(EMPTY_FORM);
    });

    it('D3: hydrates every field from a full user', () => {
        expect(
            initialFormValues({
                name: 'Alvin Pratama',
                email: 'alvin@example.test',
                academic_status: 'Dosen',
                role: 'admin',
                nim_nip: '121140154',
                major_department: 'Teknik Kimia',
                total_points: 55,
            }),
        ).toEqual({
            name: 'Alvin Pratama',
            email: 'alvin@example.test',
            academic_status: 'Dosen',
            role: 'admin',
            nim_nip: '121140154',
            major_department: 'Teknik Kimia',
            total_points: 55,
        });
    });

    it('D4: falls back for every missing field of a bare user', () => {
        expect(initialFormValues({})).toEqual(EMPTY_FORM);
    });
});

describe('buildUserSchema', () => {
    it('D5: accepts a consistent Mahasiswa', () => {
        expect(schemaFor(true).safeParse(mahasiswaValues).success).toBe(true);
    });

    it('D6: accepts a consistent staff member', () => {
        expect(schemaFor(false).safeParse(staffValues).success).toBe(true);
    });

    it('D7: composes the email rule per status', () => {
        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, email: 'budi@itera.ac.id' },
            ['email'],
            'Email must follow the format firstname.nim@student.itera.ac.id',
        );

        parseFailure(
            schemaFor(false),
            { ...staffValues, email: 'alvin.121140154@student.itera.ac.id' },
            ['email'],
            'Email must follow the format name@itera.ac.id or a valid unit domain',
        );
    });

    it('D8: composes the NIM/NIP rule per status', () => {
        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, nim_nip: '198504122010011001' },
            ['nim_nip'],
            'NIM must be exactly 9 digits',
        );

        parseFailure(
            schemaFor(false),
            { ...staffValues, nim_nip: '121140154' },
            ['nim_nip'],
            'NIP must be exactly 18 digits',
        );
    });

    it('D9: guards the points field', () => {
        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, total_points: -1 },
            ['total_points'],
            'Points must be a positive number',
        );

        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, total_points: 1.5 },
            ['total_points'],
            'Points must be a whole number',
        );

        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, total_points: '' },
            ['total_points'],
            'Points must be a positive number',
        );
    });

    it('D10: rejects roles outside the enum', () => {
        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, role: 'superuser' },
            ['role'],
        );
    });

    it('D11: rejects academic statuses outside the enum', () => {
        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, academic_status: 'Alumni' },
            ['academic_status'],
        );
    });

    it('D12: the first name must match the email', () => {
        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, name: 'Charlie Bumi' },
            ['name'],
            'First name must match the first name in your email',
        );
    });

    it('D13: the NIM must match the email', () => {
        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, nim_nip: '121140999' },
            ['nim_nip'],
            'NIM must match the NIM in your email',
        );
    });

    it('D14: the program studi must match the NIM digits', () => {
        parseFailure(
            schemaFor(true),
            { ...mahasiswaValues, major_department: 'Teknik Kimia' },
            ['major_department'],
            'Selected Program Studi does not match your NIM',
        );
    });

    it('D15: the staff unit must match the email domain', () => {
        parseFailure(
            schemaFor(false),
            { ...staffValues, email: 'budi@itera.ac.id' },
            ['major_department'],
            'Selected Program Studi / UPA does not match your email domain',
        );
    });
});

describe('submitUserRequest', () => {
    it('D16: PUTs the editing user row', () => {
        expect(submitUserRequest({ id: 42 })).toEqual({
            method: 'put',
            url: '/dashboard/users/42',
        });
    });

    it('D17: POSTs when there is no user', () => {
        expect(submitUserRequest(null)).toEqual({
            method: 'post',
            url: '/dashboard/users',
        });
    });

    it('D18: POSTs when the user has no id', () => {
        expect(submitUserRequest({ name: 'Draft' })).toEqual({
            method: 'post',
            url: '/dashboard/users',
        });
    });
});

describe('mapServerErrors', () => {
    it('D19: maps null to no pairs', () => {
        expect(mapServerErrors(null)).toEqual([]);
    });

    it('D20: maps an error bag to field/message pairs', () => {
        expect(
            mapServerErrors({ name: ['The name is taken'], email: ['Nope'] }),
        ).toEqual([
            ['name', ['The name is taken']],
            ['email', ['Nope']],
        ]);
    });

    it('D21: maps an empty bag to no pairs', () => {
        expect(mapServerErrors({})).toEqual([]);
    });
});

describe('dialogCopy', () => {
    it('D22: edit yields the edit title and update label', () => {
        expect(dialogCopy(true)).toEqual({
            title: 'Edit User Information',
            submitLabel: 'Update User',
        });
    });

    it('D22: add yields the add title and save label', () => {
        expect(dialogCopy(false)).toEqual({
            title: 'Add New User',
            submitLabel: 'Save User',
        });
    });
});

describe('coercePointsInput', () => {
    it('D23: an empty input stays an empty string', () => {
        // Coercing '' to 0 would silently pass the schema's .min(0);
        // '' must survive so the number rule reports it.
        expect(coercePointsInput('')).toBe('');
    });

    it('D23: a numeric string becomes a Number', () => {
        expect(coercePointsInput('42')).toBe(42);
        expect(coercePointsInput('0')).toBe(0);
    });

    it('passes decimals through for the schema to reject', () => {
        // .int() reports 3.5 — the coercion must not round it.
        expect(coercePointsInput('3.5')).toBe(3.5);
    });

    it('passes negatives through for the schema to reject', () => {
        expect(coercePointsInput('-5')).toBe(-5);
    });
});
