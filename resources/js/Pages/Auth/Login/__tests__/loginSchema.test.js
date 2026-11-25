/**
 * loginSchema tests.
 *
 * The schema is a flat object with no branches, so this file pins the
 * composition contract: the login form has exactly the email,
 * password, and remember fields, wired to the login rules (never the
 * stricter registration rules) and a plain boolean for remember.
 *
 *  D1  shape — exactly the three fields, all required
 *  D2  email uses emailLoginRule (itera domains only)
 *  D3  password uses passwordLoginRule (non-empty, no complexity)
 *  D4  remember is a plain z.boolean()
 *  D5  a full valid payload passes end to end
 */
import { describe, it, expect } from 'vitest';
import { loginSchema } from '../loginSchema';

const validLogin = {
    email: 'alvin.121140154@student.itera.ac.id',
    password: 'Password123',
    remember: false,
};

describe('loginSchema', () => {
    it('D1 — has exactly the email, password, and remember fields', () => {
        const result = loginSchema.safeParse({});

        expect(result.success).toBe(false);
        expect(
            result.error.issues.map((issue) => issue.path[0]).sort(),
        ).toEqual(['email', 'password', 'remember']);
    });

    it('D2 — the email uses the itera-domain login rule', () => {
        const result = loginSchema.safeParse({
            ...validLogin,
            email: 'test@gmail.com',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe(
            'Email must be an ITERA domain email',
        );
    });

    it('D3 — the password only requires a non-empty string', () => {
        const result = loginSchema.safeParse({
            ...validLogin,
            password: 'x',
        });

        expect(result.success).toBe(true);

        const empty = loginSchema.safeParse({ ...validLogin, password: '' });

        expect(empty.success).toBe(false);
        expect(empty.error.issues[0].message).toBe('Password is required');
    });

    it('D4 — remember accepts booleans and rejects other types', () => {
        expect(
            loginSchema.safeParse({ ...validLogin, remember: true }).success,
        ).toBe(true);
        expect(
            loginSchema.safeParse({ ...validLogin, remember: false }).success,
        ).toBe(true);
        expect(
            loginSchema.safeParse({ ...validLogin, remember: 'yes' }).success,
        ).toBe(false);
    });

    it('D5 — a full valid payload passes end to end', () => {
        expect(loginSchema.safeParse(validLogin).success).toBe(true);
    });
});
