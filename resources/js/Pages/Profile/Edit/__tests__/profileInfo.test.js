/**
 * Student profile personal info tests.
 *
 * Covers the hydration, the PATCH coercion, and the header band's
 * derivations, with the nullability map pinned from the users
 * migration:
 *
 *  initialInfoValues
 *   D1  a full user hydrates every field
 *   D2  the nullable columns are live — null nim_nip, biography,
 *       and major_departement_id each reach their fallback
 *   D3  the select's id coercion — a number id becomes its
 *       string, a null id the empty value
 *   D4  the name guard is defensive (a NOT NULL column)
 *
 *  infoSubmitValues
 *   D5  the unselected program clears to null (the nullable FK's
 *       clear); a value rides as-is
 *
 *  initialsFor
 *   D6  multi-word names take the first two initials, uppercased
 *   D7  a single word takes one initial; extra spaces drop out
 *   D8  a null or empty name yields '' (defensive)
 *
 *  pointsLabel
 *   D9  a value formats with the locale separators; a null falls
 *       back to '0' (defensive — the column defaults 0)
 *
 *  joinedDateLabel
 *   D10 a timestamp formats month/day/year en-US; null stays null
 *       (defensive — the column is NOT NULL)
 *
 *  landingErrorsFor (the update flow's error landing)
 *   D11 server errors land as-is; a save without errors clears to
 *       the empty map
 *   D12 the flow's wire contract re-summarized — the program
 *       clear rides the PATCH as null
 *
 *  guardErrorMessageFor (the shell's toast plumbing, serving the
 *  equip and toggle flows' guard keys)
 *   D13 the badge key wins when both arrive; each key alone
 *       carries its message
 *   D14 no guard error stays null
 *   D15 the ||-vs-?? mismatch probe — a falsy badge with an
 *       avatar message fires an empty toast (unreachable via real
 *       server messages)
 */
import { describe, it, expect } from 'vitest';
import {
    guardErrorMessageFor,
    initialInfoValues,
    infoSubmitValues,
    initialsFor,
    joinedDateLabel,
    landingErrorsFor,
    pointsLabel,
} from '../profileInfo';

describe('initialInfoValues', () => {
    it('D1 — a full user hydrates every field', () => {
        expect(
            initialInfoValues({
                name: 'Alvin Pratama',
                nim_nip: '121140154',
                email: 'alvin.121140154@student.itera.ac.id',
                major_departement_id: 3,
                biography: 'Gamified learning enthusiast.',
            }),
        ).toEqual({
            name: 'Alvin Pratama',
            nim_nip: '121140154',
            email: 'alvin.121140154@student.itera.ac.id',
            major_departement_id: '3',
            biography: 'Gamified learning enthusiast.',
        });
    });

    it('D2 — the nullable columns are live-capable', () => {
        // nim_nip, biography, and major_departement_id are NULL
        // columns in the migration, so their fallback arms are
        // genuinely reachable.
        const values = initialInfoValues({
            name: 'Alvin Pratama',
            nim_nip: null,
            email: 'alvin.121140154@student.itera.ac.id',
            major_departement_id: null,
            biography: null,
        });

        expect(values.nim_nip).toBe('');
        expect(values.biography).toBe('');
        expect(values.major_departement_id).toBe('');
    });

    it('D3 — the select\u2019s id coercion covers both arms', () => {
        // The options ship value strings, so the id becomes its
        // string; an unset program clears to the empty value.
        expect(
            initialInfoValues({ major_departement_id: 7 }).major_departement_id,
        ).toBe('7');
        expect(
            initialInfoValues({ major_departement_id: null })
                .major_departement_id,
        ).toBe('');
    });

    it('D4 — the name guard is defensive', () => {
        // name is a NOT NULL column; the guard fires only for a
        // missing auth shape.
        expect(initialInfoValues({ name: null }).name).toBe('');
        expect(initialInfoValues().name).toBe('');
    });
});

describe('infoSubmitValues', () => {
    it('D5 — an unselected program clears to null; a value rides as-is', () => {
        // The nullable foreign key accepts the clear only as null,
        // so the select's empty value never ships as ''.
        expect(
            infoSubmitValues({
                name: 'Alvin Pratama',
                email: 'alvin.121140154@student.itera.ac.id',
                major_departement_id: '',
                biography: '',
            }).major_departement_id,
        ).toBeNull();

        expect(
            infoSubmitValues({ major_departement_id: '3' })
                .major_departement_id,
        ).toBe('3');
    });
});

describe('initialsFor', () => {
    it('D6 — multi-word names take the first two initials, uppercased', () => {
        expect(initialsFor('Alvin Pratama')).toBe('AP');
        expect(initialsFor('Maria Sklodowska Curie')).toBe('MS');
    });

    it('D7 — a single word takes one initial; extra spaces drop out', () => {
        expect(initialsFor('Alvin')).toBe('A');
        expect(initialsFor('  Alvin   Pratama ')).toBe('AP');
    });

    it('D8 — a null or empty name yields the empty string', () => {
        expect(initialsFor(null)).toBe('');
        expect(initialsFor('')).toBe('');
    });
});

describe('pointsLabel', () => {
    it('D9 — a value groups its thousands; a null falls back to zero', () => {
        // The separator follows the viewer's machine locale
        // (toLocaleString with no explicit locale): an id-ID
        // machine renders '12.000', an en-US one '12,000'. The
        // contract is the grouping itself, pinned structurally.
        expect(pointsLabel(12000)).toMatch(/^12[.,]000$/);
        expect(pointsLabel(0)).toBe('0');
        // Defensive: the column defaults 0 and never ships null.
        expect(pointsLabel(null)).toBe('0');
    });
});

describe('joinedDateLabel', () => {
    it('D10 — a timestamp formats en-US; null stays null', () => {
        // Noon UTC keeps the same calendar date in any timezone,
        // so the pin is not fragile across machines.
        expect(joinedDateLabel('2026-01-05T12:00:00.000000Z')).toBe('1/5/2026');
        // Defensive: the column is NOT NULL; the arm fires only
        // for a missing auth shape.
        expect(joinedDateLabel(null)).toBeNull();
    });
});

describe('landingErrorsFor — the update flow', () => {
    it('D11 — server errors land as-is; a save without errors clears to empty', () => {
        expect(
            landingErrorsFor({ email: 'The email has already been taken.' }),
        ).toEqual({ email: 'The email has already been taken.' });

        // The success path re-renders without an error payload,
        // so the landing clears stale field errors.
        expect(landingErrorsFor(null)).toEqual({});
    });

    it('D12 — the flow\u2019s wire contract: the program clear rides the PATCH as null', () => {
        // Re-summarized from the personal info suite's D5 for this
        // flow's completeness — the nullable foreign key accepts
        // the clear only as null.
        expect(
            infoSubmitValues({ major_departement_id: '' }).major_departement_id,
        ).toBeNull();
    });
});

describe('guardErrorMessageFor — the shell\u2019s toast plumbing', () => {
    it('D13 — each guard key carries its message; the badge key wins when both arrive', () => {
        expect(guardErrorMessageFor({ badge: 'Badge already equipped.' })).toBe(
            'Badge already equipped.',
        );
        expect(
            guardErrorMessageFor({
                avatar: 'You have not unlocked this avatar yet.',
            }),
        ).toBe('You have not unlocked this avatar yet.');
        expect(
            guardErrorMessageFor({ badge: 'Badge key', avatar: 'Avatar key' }),
        ).toBe('Badge key');
    });

    it('D14 — no guard error stays null', () => {
        expect(guardErrorMessageFor({})).toBeNull();
        expect(guardErrorMessageFor(null)).toBeNull();
    });

    it('D15 — the ||-vs-?? mismatch probe fires an empty toast', () => {
        // The condition checks truthiness while the message
        // selects nullishness: a falsy-yet-nonnullish badge key
        // with an avatar message present fires the toast carrying
        // the empty badge string. Unreachable through real server
        // messages (never empty strings); pinned as the contract.
        expect(
            guardErrorMessageFor({
                badge: '',
                avatar: 'You have not unlocked this avatar yet.',
            }),
        ).toBe('');
    });
});
