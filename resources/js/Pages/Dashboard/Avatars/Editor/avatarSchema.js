import { z } from 'zod';

export const CONDITION_TYPES = [
    'points',
    'quiz',
    'course',
    'path',
    'challenge',
];

export const OPERATORS = ['>=', '<=', '>', '<', '='];

export const MAX_IMAGE_MB = 2;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const conditionSchema = z.object({
    type: z.enum(CONDITION_TYPES, {
        error: 'Select a condition type',
    }),
    operator: z.enum(OPERATORS, {
        error: 'Select a valid operator',
    }),
    // The value stays a string on the wire — the requirements
    // JSON stores thresholds and titles alike.
    value: z.string().trim().min(1, 'Value is required'),
});

/**
 * The avatar editor's whole-payload schema — metadata, the
 * optional icon, and the unlock requirements. Mirrors the server's
 * validation so both sides reject the same payloads.
 */
export function buildAvatarSchema() {
    return z.object({
        title: z
            .string()
            .trim()
            .min(1, 'Avatar title is required')
            .max(255, 'Avatar title is too long'),
        description: z.string().trim().min(1, 'Description is required'),
        // The icon is optional — a fresh upload replaces the
        // stored one, the remove flag clears it, anything else
        // keeps it.
        icon: z
            .instanceof(File, {
                message: 'Avatar icon is invalid',
            })
            .refine((file) => file.size <= MAX_IMAGE_MB * 1024 * 1024, {
                message: `Icon must be smaller than ${MAX_IMAGE_MB} MB`,
            })
            .refine((file) => IMAGE_MIME_TYPES.includes(file.type), {
                message: 'Icon must be a JPEG, PNG, or WebP file',
            })
            .nullable(),
        remove_icon: z.boolean(),
        logic: z.enum(['AND', 'OR'], {
            error: 'Select a valid logic',
        }),
        conditions: z
            .array(conditionSchema)
            .min(1, 'At least one earning condition must be added'),
    });
}
