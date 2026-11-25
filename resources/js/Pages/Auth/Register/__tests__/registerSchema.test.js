/**
 * buildRegisterSchema tests.
 *
 * Covers the status → rule wiring decisions. The refines' internal
 * isMahasiswa guards are already decision-covered in register.test.js
 * (D1–D7); this file pins the composition itself:
 *
 *  D1  email ternary, mahasiswa side — student format passes, staff
 *      format fails
 *  D2  email ternary, staff side — whitelisted unit domain passes,
 *      student format fails
 *  D3  nim_nip ternary, mahasiswa side — 9-digit NIM passes, 18-digit
 *      NIP fails
 *  D4  nim_nip ternary, staff side — 18-digit NIP passes, 9-digit NIM
 *      fails
 *  D5  department enum — accepts the current status's options and
 *      rejects options only available to the other status
 *  D6  full-pipeline happy paths — proves the refines compose with
 *      the right per-status rules
 */
import { describe, it, expect } from 'vitest';
import { buildRegisterSchema } from '../registerSchema';

/** Mirrors the MajorDepartementSeeder shape (code null = UPA unit). */
const majorDepartements = [
    {
        name: 'Teknik Informatika',
        major_departement_code: 14,
        major_departement_domain: 'if.itera.ac.id',
    },
    {
        name: 'Fisika',
        major_departement_code: 11,
        major_departement_domain: 'fi.itera.ac.id',
    },
    {
        name: 'UPA TIK',
        major_departement_code: null,
        major_departement_domain: 'upa.itera.ac.id',
    },
];

// NIM 121140154 → digits 4-5 are "14" → Teknik Informatika.
const validMahasiswa = {
    name: 'Alvin Kesuma',
    email: 'alvin.121140154@student.itera.ac.id',
    academic_status: 'Mahasiswa',
    nim_nip: '121140154',
    major_departement: 'Teknik Informatika',
    password: 'Password123',
    password_confirmation: 'Password123',
};

const validStaff = {
    name: 'Budi Santoso',
    email: 'budi@if.itera.ac.id',
    academic_status: 'Dosen',
    nim_nip: '198504122010011001',
    major_departement: 'Teknik Informatika',
    password: 'Password123',
    password_confirmation: 'Password123',
};

const mahasiswaSchema = buildRegisterSchema({
    isMahasiswa: true,
    majorDepartements,
});
const staffSchema = buildRegisterSchema({
    isMahasiswa: false,
    majorDepartements,
});

describe('buildRegisterSchema — email ternary', () => {
    it('D1 — mahasiswa schema accepts the student email format', () => {
        expect(mahasiswaSchema.safeParse(validMahasiswa).success).toBe(true);
    });

    it('D1 — mahasiswa schema rejects a staff unit-domain email', () => {
        const result = mahasiswaSchema.safeParse({
            ...validMahasiswa,
            email: 'budi@if.itera.ac.id',
        });

        expect(result.success).toBe(false);
    });

    it('D2 — staff schema accepts a whitelisted unit-domain email', () => {
        expect(staffSchema.safeParse(validStaff).success).toBe(true);
    });

    it('D2 — staff schema rejects the student email format', () => {
        const result = staffSchema.safeParse({
            ...validStaff,
            email: 'alvin.121140154@student.itera.ac.id',
        });

        expect(result.success).toBe(false);
    });

    it('D2 — a bare itera.ac.id email passes the email rule but not the department refine', () => {
        // The email rule whitelists itera.ac.id (see staffEmailDomains.test.js);
        // departementStaffRefine then requires the email to end with the
        // selected department's own domain. The layering is intentional.
        const result = staffSchema.safeParse({
            ...validStaff,
            email: 'budi@itera.ac.id',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('major_departement');
    });
});

describe('buildRegisterSchema — nim_nip ternary', () => {
    it('D3 — mahasiswa schema accepts a 9-digit NIM', () => {
        expect(mahasiswaSchema.safeParse(validMahasiswa).success).toBe(true);
    });

    it('D3 — mahasiswa schema rejects an 18-digit NIP', () => {
        const result = mahasiswaSchema.safeParse({
            ...validMahasiswa,
            nim_nip: '198504122010011001',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('nim_nip');
    });

    it('D4 — staff schema accepts an 18-digit NIP', () => {
        expect(staffSchema.safeParse(validStaff).success).toBe(true);
    });

    it('D4 — staff schema rejects a 9-digit NIM', () => {
        const result = staffSchema.safeParse({
            ...validStaff,
            nim_nip: '121140154',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('nim_nip');
    });
});

describe('buildRegisterSchema — department enum', () => {
    it('D5 — mahasiswa schema accepts a major and rejects a UPA unit', () => {
        expect(mahasiswaSchema.safeParse(validMahasiswa).success).toBe(true);

        const result = mahasiswaSchema.safeParse({
            ...validMahasiswa,
            major_departement: 'UPA TIK',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('major_departement');
    });

    it('D5 — staff schema accepts a UPA unit', () => {
        const result = staffSchema.safeParse({
            ...validStaff,
            email: 'budi@upa.itera.ac.id',
            major_departement: 'UPA TIK',
        });

        expect(result.success).toBe(true);
    });
});

describe('buildRegisterSchema — full pipeline', () => {
    it('D6 — a fully valid mahasiswa payload passes every refine', () => {
        expect(mahasiswaSchema.safeParse(validMahasiswa).success).toBe(true);
    });

    it('D6 — a fully valid staff payload passes every refine', () => {
        expect(staffSchema.safeParse(validStaff).success).toBe(true);
    });
});
