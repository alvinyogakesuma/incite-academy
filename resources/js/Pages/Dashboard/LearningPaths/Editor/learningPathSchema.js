import { z } from 'zod';

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

export const MAX_IMAGE_MB = 2;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * The learning path editor's whole-payload schema — metadata,
 * the cover image, and the course sequence. Mirrors the server's
 * validation so both sides reject the same payloads.
 *
 * @param {boolean} hasExistingImage
 */
export function buildLearningPathSchema(hasExistingImage) {
    return z
        .object({
            title: z
                .string()
                .trim()
                .min(1, 'Path title is required')
                .max(255, 'Path title is too long'),
            description: z.string().trim().min(1, 'Description is required'),
            level: z.enum(LEVELS, {
                error: 'Select a valid level',
            }),
            image: z
                .instanceof(File, {
                    message: 'Learning path image is required',
                })
                .refine((file) => file.size <= MAX_IMAGE_MB * 1024 * 1024, {
                    message: `Image must be smaller than ${MAX_IMAGE_MB} MB`,
                })
                .refine((file) => IMAGE_MIME_TYPES.includes(file.type), {
                    message: 'Image must be a JPEG, PNG, or WebP file',
                })
                .nullable(),
            remove_image: z.boolean(),
            // The course sequence — one slot per picked course,
            // order carrying the pivot's order_index.
            courses: z.array(
                z.object({
                    course_id: z
                        .number({
                            error: 'Select a course',
                        })
                        .int()
                        .positive(),
                }),
            ),
        })
        .superRefine((path, ctx) => {
            // The cover image is required unless one is already
            // stored and this save keeps it.
            if (!path.image && (!hasExistingImage || path.remove_image)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['image'],
                    message: 'Learning path image is required',
                });
            }

            // A sequence needs at least one course.
            if (path.courses.length === 0) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['courses'],
                    message: 'Add at least one course to the sequence',
                });
            }

            // Each course appears once — duplicates would collapse
            // silently into the pivot.
            const ids = path.courses.map((slot) => slot.course_id);

            if (new Set(ids).size !== ids.length) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['courses'],
                    message: 'Each course can only appear once in the sequence',
                });
            }
        });
}
