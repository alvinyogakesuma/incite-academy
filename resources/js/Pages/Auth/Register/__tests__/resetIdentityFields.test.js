/**
 * resetIdentityFields tests.
 *
 * Covers the single decision in the module — the XOR on crossing
 * the Mahasiswa boundary — with the full four-cell truth table.
 * Only crossings of the boundary reset `nim_nip` and
 * `major_departement`; Dosen ↔ Staff share the NIP format and the
 * full unit list, so switching between them must keep the fields.
 */
import { describe, it, expect } from 'vitest';
import { shouldResetIdentityFields } from '../resetIdentityFields';

describe('shouldResetIdentityFields', () => {
    it('M → M: same status, no reset', () => {
        expect(shouldResetIdentityFields('Mahasiswa', 'Mahasiswa')).toBe(false);
    });

    it('M → D: crossing out of Mahasiswa resets', () => {
        expect(shouldResetIdentityFields('Mahasiswa', 'Dosen')).toBe(true);
    });

    it('D → S: both non-Mahasiswa, no reset', () => {
        expect(shouldResetIdentityFields('Dosen', 'Staff')).toBe(false);
    });

    it('S → M: crossing into Mahasiswa resets', () => {
        expect(shouldResetIdentityFields('Staff', 'Mahasiswa')).toBe(true);
    });

    it('D → D and S → S: no reset', () => {
        expect(shouldResetIdentityFields('Dosen', 'Dosen')).toBe(false);
        expect(shouldResetIdentityFields('Staff', 'Staff')).toBe(false);
    });
});
