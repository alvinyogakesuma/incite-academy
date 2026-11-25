/**
 * Unit tests for `@/utils/zodRules.js`.
 *
 * Principle: one test case per chain validation method. Every input is
 * crafted so exactly one link in the chain fails (or the link's specific
 * effect — a transform, or chain ordering — is isolated).
 */
import { describe, it, expect } from 'vitest';
import {
    nameRule,
    emailMahasiswaRule,
    emailStaffRule,
    emailLoginRule,
    nimRule,
    nipRule,
    majorDepartementRule,
    passwordRule,
    passwordConfirmationRule,
    passwordLoginRule,
} from '@/utils/zodRules.js';

/** Parse helper: returns the safeParse result for a rule/value pair. */
const parse = (rule, value) => rule.safeParse(value);

/** Assert a value is accepted by a rule and return the parsed data. */
const expectValid = (rule, value) => {
    const result = parse(rule, value);
    expect(result.success).toBe(true);
    return result.data;
};

/** Assert a value is rejected by a rule with an exact message. */
const expectInvalid = (rule, value, message) => {
    const result = parse(rule, value);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(message);
};

describe('nameRule', () => {
    // z.string().trim().min(1, 'Nama is required').max(255, 'Name is too long')

    it('.string() — accepts a regular name', () => {
        expect(expectValid(nameRule, 'Alvin Yoga Kesuma')).toBe(
            'Alvin Yoga Kesuma',
        );
    });

    it('.string() — rejects a non-string and short-circuits the chain', () => {
        const result = parse(nameRule, 12345);

        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
    });

    it('.trim() — strips surrounding whitespace from the parsed data', () => {
        expect(expectValid(nameRule, '   Alvin   ')).toBe('Alvin');
    });

    it('.trim() runs before .min() — whitespace-only counts as empty', () => {
        expectInvalid(nameRule, '   ', 'Nama is required');
    });

    it('.min(1) — rejects an empty string', () => {
        expectInvalid(nameRule, '', 'Nama is required');
    });

    it('.min(1) — accepts the 1-character boundary', () => {
        expect(expectValid(nameRule, 'a')).toBe('a');
    });

    it('.max(255) — rejects 256 characters', () => {
        expectInvalid(nameRule, 'a'.repeat(256), 'Name is too long');
    });

    it('.max(255) — accepts the 255-character boundary', () => {
        const value = 'a'.repeat(255);
        expect(expectValid(nameRule, value)).toBe(value);
    });

    it('.trim() runs before .max() — trailing space does not overflow the limit', () => {
        const value = `${'a'.repeat(255)} `; // 256 raw, 255 after trim
        expect(expectValid(nameRule, value)).toBe('a'.repeat(255));
    });
});

describe('emailMahasiswaRule', () => {
    const message =
        'Email must follow the format firstname.nim@student.itera.ac.id';

    it('.string() — accepts a formatted student email', () => {
        expect(
            expectValid(
                emailMahasiswaRule,
                'alvin.121140154@student.itera.ac.id',
            ),
        ).toBe('alvin.121140154@student.itera.ac.id');
    });

    it('.string() — rejects a non-string', () => {
        const result = parse(emailMahasiswaRule, 121140154);

        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
    });

    it('.regex() — accepts a multi-dot local part', () => {
        expectValid(
            emailMahasiswaRule,
            'alvin.yoga.kesuma.121140154@student.itera.ac.id',
        );
    });

    it('.regex() — rejects a missing NIM segment', () => {
        expectInvalid(emailMahasiswaRule, 'alvin@student.itera.ac.id', message);
    });

    it('.regex() — rejects an 8-digit NIM', () => {
        expectInvalid(
            emailMahasiswaRule,
            'alvin.12114015@student.itera.ac.id',
            message,
        );
    });

    it('.regex() — rejects a 10-digit NIM', () => {
        expectInvalid(
            emailMahasiswaRule,
            'alvin.1211401544@student.itera.ac.id',
            message,
        );
    });

    it('.regex() — rejects the staff domain', () => {
        expectInvalid(
            emailMahasiswaRule,
            'alvin.121140154@itera.ac.id',
            message,
        );
    });

    it('.regex() — rejects uppercase letters', () => {
        expectInvalid(
            emailMahasiswaRule,
            'Alvin.121140154@student.itera.ac.id',
            message,
        );
    });

    it('.regex() — rejects an unrelated domain', () => {
        expectInvalid(emailMahasiswaRule, 'alvin.121140154@gmail.com', message);
    });
});

describe('emailStaffRule', () => {
    const message =
        'Email must follow the format name@itera.ac.id or a valid unit domain';
    const rule = emailStaffRule(['itera.ac.id', 'tik.itera.ac.id']);

    it('factory — builds a rule from the given domain list', () => {
        expect(rule).toBeTypeOf('object');
    });

    it('.string() — accepts a staff email on the root domain', () => {
        expect(expectValid(rule, 'budi@itera.ac.id')).toBe('budi@itera.ac.id');
    });

    it('.string() — rejects a non-string', () => {
        const result = parse(rule, 12345);

        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
    });

    it('.regex() — accepts a listed unit domain', () => {
        expectValid(rule, 'budi@tik.itera.ac.id');
    });

    it('.regex() — rejects an unlisted domain', () => {
        expectInvalid(rule, 'budi@gmail.com', message);
    });

    it('.regex() — treats domain dots as literal, not wildcards', () => {
        // If the dots were unescaped regex metacharacters, "iteraxacxid"
        // would match the alternation. It must not.
        expectInvalid(rule, 'budi@iteraxacxid', message);
    });

    it('.regex() — does not accept subdomains of a listed unit domain', () => {
        expectInvalid(rule, 'budi@mail.tik.itera.ac.id', message);
    });

    it('.regex() — rejects a missing local part', () => {
        expectInvalid(rule, '@itera.ac.id', message);
    });

    it('.regex() — rejects uppercase local parts', () => {
        expectInvalid(rule, 'Budi@itera.ac.id', message);
    });

    it('factory — works from a single-domain list', () => {
        const single = emailStaffRule(['only.ac.id']);

        expectValid(single, 'budi@only.ac.id');
        expectInvalid(single, 'budi@itera.ac.id', message);
    });
});

describe('emailLoginRule', () => {
    const message = 'Email must be an ITERA domain email';

    it('.string() — accepts an email on the root domain', () => {
        expect(expectValid(emailLoginRule, 'alvin@itera.ac.id')).toBe(
            'alvin@itera.ac.id',
        );
    });

    it('.string() — rejects a non-string', () => {
        const result = parse(emailLoginRule, 12345);

        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
    });

    it('.regex() — accepts the student subdomain', () => {
        expectValid(emailLoginRule, 'alvin.121140154@student.itera.ac.id');
    });

    it('.regex() — accepts a deep subdomain', () => {
        expectValid(emailLoginRule, 'alvin@mail.tik.itera.ac.id');
    });

    it('.regex() — rejects an unrelated domain', () => {
        expectInvalid(emailLoginRule, 'alvin@gmail.com', message);
    });

    it('.regex() — rejects suffix spoofing', () => {
        expectInvalid(emailLoginRule, 'alvin@itera.ac.id.evil.com', message);
    });

    it('.regex() — rejects uppercase domains', () => {
        expectInvalid(emailLoginRule, 'alvin@ITERA.ac.id', message);
    });

    it('.regex() — requires a local part on the root domain', () => {
        // Regression: the regex previously accepted a bare "@itera.ac.id".
        expectInvalid(emailLoginRule, '@itera.ac.id', message);
    });

    it('.regex() — requires a local part on a subdomain', () => {
        expectInvalid(emailLoginRule, '@student.itera.ac.id', message);
    });
});

describe('nimRule', () => {
    const message = 'NIM must be exactly 9 digits';

    it('.string() — accepts 9 digits', () => {
        expect(expectValid(nimRule, '121140154')).toBe('121140154');
    });

    it('.string() — rejects a non-string', () => {
        const result = parse(nimRule, 121140154);

        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
    });

    it('.regex() — rejects 8 digits', () => {
        expectInvalid(nimRule, '12114015', message);
    });

    it('.regex() — rejects 10 digits', () => {
        expectInvalid(nimRule, '1211401544', message);
    });

    it('.regex() — rejects non-digit characters', () => {
        expectInvalid(nimRule, '12114015a', message);
    });

    it('.regex() — rejects an empty string', () => {
        expectInvalid(nimRule, '', message);
    });
});

describe('nipRule', () => {
    const message = 'NIP must be exactly 18 digits';

    it('.string() — accepts 18 digits', () => {
        expect(expectValid(nipRule, '198504122010011001')).toBe(
            '198504122010011001',
        );
    });

    it('.string() — rejects a non-string', () => {
        const result = parse(nipRule, Number('198504122010011001'));

        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
    });

    it('.regex() — rejects 17 digits', () => {
        expectInvalid(nipRule, '19850412201001100', message);
    });

    it('.regex() — rejects 19 digits', () => {
        expectInvalid(nipRule, '1985041220100110011', message);
    });

    it('.regex() — rejects non-digit characters', () => {
        expectInvalid(nipRule, '19850412201001100x', message);
    });
});

describe('majorDepartementRule', () => {
    const message = 'Select a valid program studi';
    const rule = majorDepartementRule(['Teknik Informatika', 'UPA TIK']);

    it('factory — builds a rule from the given option list', () => {
        expect(rule).toBeTypeOf('object');
    });

    it('accepts a listed option and preserves the value', () => {
        expect(expectValid(rule, 'Teknik Informatika')).toBe(
            'Teknik Informatika',
        );
    });

    it('rejects an unlisted option', () => {
        expectInvalid(rule, 'Kedokteran', message);
    });

    it('rejects the empty selection the form starts with', () => {
        expectInvalid(rule, '', message);
    });

    it('rejects a partial option match', () => {
        expectInvalid(rule, 'Teknik ', message);
    });

    it('rejects a case mismatch', () => {
        expectInvalid(rule, 'teknik informatika', message);
    });

    it('rejects a non-string', () => {
        const result = parse(rule, 42);

        expect(result.success).toBe(false);
    });
});

/** Shared per-method cases for the two identical password chains. */
const describePasswordChain = (rule) => {
    it('accepts a compliant password', () => {
        expect(expectValid(rule, 'Password123')).toBe('Password123');
    });

    it('rejects a non-string', () => {
        const result = parse(rule, 12345678);

        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
    });

    it('.min(8) — rejects a 7-character password with all classes present', () => {
        expectInvalid(
            rule,
            'Ab1ab1a',
            'Password must be at least 8 characters',
        );
    });

    it('.min(8) — accepts the 8-character boundary', () => {
        expectValid(rule, 'Ab1ab1ab');
    });

    it('.regex() [A-Z] — rejects a password without an uppercase letter', () => {
        expectInvalid(
            rule,
            'password123',
            'Password must contain an uppercase letter',
        );
    });

    it('.regex() [a-z] — rejects a password without a lowercase letter', () => {
        expectInvalid(
            rule,
            'PASSWORD123',
            'Password must contain a lowercase letter',
        );
    });

    it('.regex() \\d — rejects a password without a digit', () => {
        expectInvalid(rule, 'PasswordOnly', 'Password must contain a number');
    });
};

describe('passwordRule', () => {
    describePasswordChain(passwordRule);
});

describe('passwordConfirmationRule', () => {
    describePasswordChain(passwordConfirmationRule);
});

describe('passwordLoginRule', () => {
    it('.string() — accepts a non-empty password', () => {
        expect(expectValid(passwordLoginRule, 'whatever')).toBe('whatever');
    });

    it('.string() — rejects a non-string', () => {
        const result = parse(passwordLoginRule, 12345);

        expect(result.success).toBe(false);
        expect(result.error.issues).toHaveLength(1);
    });

    it('.min(1) — rejects an empty string', () => {
        expectInvalid(passwordLoginRule, '', 'Password is required');
    });
});
