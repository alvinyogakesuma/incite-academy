/**
 * emailLoginRule and passwordLoginRule tests.
 *
 * The login rules were the only zodRules exports without behavioral
 * tests — istanbul "covers" a regex literal on import, so this file
 * pins the pass/fail behavior instead:
 *
 *  D1  emailLoginRule local part `[a-z0-9.-]+` (lowercase-only,
 *      mirroring the registration rules)
 *  D2  emailLoginRule domain `(?:[a-z0-9-]+\.)*itera\.ac\.id`
 *      (bare domain, any subdomain depth, hyphenated labels)
 *  D3  emailLoginRule rejection (foreign domain, empty local part,
 *      trailing host, whitespace, uppercase anywhere)
 *  D4  passwordLoginRule min(1) boundary (non-empty / empty)
 *
 * Requirement: emails must be lowercase. Registration enforces it via
 * `[a-z0-9.-]` local parts, and the login rule mirrors it. The former
 * asymmetry — a permissive `[^\s@]+` local part — was resolved by
 * tightening rather than accepting.
 */
import { describe, it, expect } from 'vitest';
import { emailLoginRule, passwordLoginRule } from '@/utils/zodRules.js';

describe('emailLoginRule', () => {
    it('D2 — accepts the student email format', () => {
        expect(
            emailLoginRule.safeParse('alvin.121140154@student.itera.ac.id')
                .success,
        ).toBe(true);
    });

    it('D2 — accepts the bare institutional domain', () => {
        expect(emailLoginRule.safeParse('budi@itera.ac.id').success).toBe(true);
    });

    it('D2 — accepts any unit subdomain', () => {
        expect(emailLoginRule.safeParse('budi@mail.itera.ac.id').success).toBe(
            true,
        );
    });

    it('D2 — accepts any subdomain depth', () => {
        expect(
            emailLoginRule.safeParse('budi@faculty.mail.itera.ac.id').success,
        ).toBe(true);
    });

    it('D2 — accepts a hyphenated subdomain label', () => {
        expect(
            emailLoginRule.safeParse('budi@e-learning.itera.ac.id').success,
        ).toBe(true);
    });

    it('D1 — the local part is lowercase-only (mirrors registration)', () => {
        expect(emailLoginRule.safeParse('Alvin@itera.ac.id').success).toBe(
            false,
        );
    });

    it('D3 — rejects a foreign domain with the itera message', () => {
        const result = emailLoginRule.safeParse('test@gmail.com');

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe(
            'Email must be an ITERA domain email',
        );
    });

    it('D3 — rejects an empty local part', () => {
        expect(emailLoginRule.safeParse('@itera.ac.id').success).toBe(false);
    });

    it('D3 — rejects a trailing host after the domain', () => {
        expect(
            emailLoginRule.safeParse('budi@itera.ac.id.evil.com').success,
        ).toBe(false);
    });

    it('D3 — rejects whitespace in the local part', () => {
        expect(emailLoginRule.safeParse('bu di@itera.ac.id').success).toBe(
            false,
        );
    });

    it('D3 — rejects an empty string', () => {
        expect(emailLoginRule.safeParse('').success).toBe(false);
    });

    it('D3 — rejects an uppercase domain (emails must be lowercase)', () => {
        expect(
            emailLoginRule.safeParse('budi@STUDENT.itera.ac.id').success,
        ).toBe(false);
    });
});

describe('passwordLoginRule', () => {
    it('D4 — a non-empty string passes (min 1 boundary)', () => {
        expect(passwordLoginRule.safeParse('x').success).toBe(true);
    });

    it('D4 — an arbitrary password passes (no complexity here)', () => {
        expect(passwordLoginRule.safeParse('password').success).toBe(true);
    });

    it('D4 — an empty string fails with the required message', () => {
        const result = passwordLoginRule.safeParse('');

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe('Password is required');
    });
});
