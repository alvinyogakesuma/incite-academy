/**
 * staffEmailDomainsFor tests.
 *
 * Covers the decisions in the module:
 *  D1  `itera.ac.id` is prepended first (the bare institutional
 *      domain must be accepted for staff emails)
 *  D2  the Set dedupe (duplicate faculty domains / unique domains)
 *  D3  the falsy-domain guard — a null major_departement_domain is
 *      filtered out; DD #2: without the guard the null survives the
 *      Set and crashes emailStaffRule's domain.replace(...) with a
 *      TypeError.
 */
import { describe, it, expect } from 'vitest';
import { staffEmailDomainsFor } from '../staffEmailDomains';
import { emailStaffRule } from '@/utils/zodRules.js';

/** Mirrors the MajorDepartementSeeder shape, incl. a shared domain. */
const majorDepartements = [
    {
        name: 'Fisika',
        major_departement_code: 11,
        major_departement_domain: 'fi.itera.ac.id',
    },
    {
        name: 'Magister Fisika',
        major_departement_code: 11,
        major_departement_domain: 'fi.itera.ac.id',
    },
    {
        name: 'Teknik Informatika',
        major_departement_code: 14,
        major_departement_domain: 'if.itera.ac.id',
    },
];

describe('staffEmailDomainsFor', () => {
    it('D1 — prepends itera.ac.id as the first entry', () => {
        expect(staffEmailDomainsFor(majorDepartements)[0]).toBe('itera.ac.id');
    });

    it('D2 dedupe — collapses departments sharing a faculty domain', () => {
        const domains = staffEmailDomainsFor(majorDepartements);

        expect(domains.filter((d) => d === 'fi.itera.ac.id')).toHaveLength(1);
        expect(domains).toHaveLength(3); // itera.ac.id + fi + if
    });

    it('D2 dedupe — keeps unique unit domains intact', () => {
        const domains = staffEmailDomainsFor(majorDepartements);

        expect(domains).toContain('if.itera.ac.id');
        expect(domains).toContain('fi.itera.ac.id');
    });

    it('D3 guard — filters out a null major_departement_domain', () => {
        const withNullDomain = [
            ...majorDepartements,
            {
                name: 'UPA TIK',
                major_departement_code: null,
                major_departement_domain: null,
            },
        ];

        const domains = staffEmailDomainsFor(withNullDomain);

        expect(domains).not.toContain(null);
        expect(domains).not.toContain(undefined);
        expect(domains).toHaveLength(3);
    });

    it('D3 guard — the whitelist feeds emailStaffRule without throwing', () => {
        const withNullDomain = [
            {
                name: 'UPA TIK',
                major_departement_code: null,
                major_departement_domain: null,
            },
        ];

        const rule = emailStaffRule(staffEmailDomainsFor(withNullDomain));

        // Would throw a TypeError on domain.replace(...) if null leaked through.
        expect(rule.safeParse('budi@itera.ac.id').success).toBe(true);
        expect(rule.safeParse('budi@gmail.com').success).toBe(false);
    });
});
