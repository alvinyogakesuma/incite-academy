import { z } from 'zod';
import { emailLoginRule, passwordLoginRule } from '@/utils/zodRules.js';

/**
 * Login form schema.
 *
 * Deliberately permissive: the email rule accepts any ITERA domain
 * (including all subdomains) so every existing account can sign in,
 * and the password only requires a non-empty string. Registration
 * enforces the strict formats; login must not re-enforce them.
 */
export const loginSchema = z.object({
    email: emailLoginRule,
    password: passwordLoginRule,
    remember: z.boolean(),
});
