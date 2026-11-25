/**
 * majorDepartementOptionsFor tests.
 *
 * Covers the two decisions in the module:
 *  D1  the filter predicate `md.major_departement_code !== null`
 *      (kept / filtered)
 *  D2  the isMahasiswa ternary (filtered majors list / full unit list)
 * plus order preservation — the dropdown must list departments in
 * seeder order, matching `prodiMahasiswaRefine`'s lookup source.
 */
import { describe, it, expect } from 'vitest';
import { majorDepartementOptionsFor } from '../majorDepartementOptions';

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
    {
        name: 'UPA Perpustakaan',
        major_departement_code: null,
        major_departement_domain: 'perpustakaan.itera.ac.id',
    },
    {
        name: 'Teknik Elektro',
        major_departement_code: 13,
        major_departement_domain: 'el.itera.ac.id',
    },
];

describe('majorDepartementOptionsFor', () => {
    it('D1 kept — departments with a numeric code stay in the list', () => {
        const options = majorDepartementOptionsFor(true, majorDepartements);

        expect(options).toContain('Teknik Informatika');
        expect(options).toContain('Fisika');
        expect(options).toContain('Teknik Elektro');
    });

    it('D1 filtered — UPA units with a null code are excluded for mahasiswa', () => {
        const options = majorDepartementOptionsFor(true, majorDepartements);

        expect(options).not.toContain('UPA TIK');
        expect(options).not.toContain('UPA Perpustakaan');
    });

    it('D2 mahasiswa — returns only the majors (3 of 5)', () => {
        expect(majorDepartementOptionsFor(true, majorDepartements)).toEqual([
            'Teknik Informatika',
            'Fisika',
            'Teknik Elektro',
        ]);
    });

    it('D2 staff — returns the whole list including UPA units (5 of 5)', () => {
        expect(majorDepartementOptionsFor(false, majorDepartements)).toEqual([
            'Teknik Informatika',
            'Fisika',
            'UPA TIK',
            'UPA Perpustakaan',
            'Teknik Elektro',
        ]);
    });

    it('preserves the majorDepartements order for both statuses', () => {
        const staffOptions = majorDepartementOptionsFor(
            false,
            majorDepartements,
        );
        const mahasiswaOptions = majorDepartementOptionsFor(
            true,
            majorDepartements,
        );

        // Staff list is order-identical to the source.
        expect(staffOptions).toEqual(majorDepartements.map((md) => md.name));

        // Mahasiswa list preserves the relative order of the kept majors.
        expect(mahasiswaOptions).toEqual(
            majorDepartements
                .filter((md) => md.major_departement_code !== null)
                .map((md) => md.name),
        );
    });
});
