/**
 * Course editor — course information panel logic.
 *
 * The panel keeps the react-hook-form wiring; these helpers own the
 * decisions so every outcome is unit testable:
 *
 *  - buildCourseInfoSchema  the zod schema factory: the metadata
 *                            rules, the dynamic category enum, the
 *                            image rule chain (File instance, size
 *                            limit, MIME whitelist, nullable), and
 *                            the 3-way image decision — a cover is
 *                            required unless one is already stored
 *                            and this save keeps it.
 *  - courseStatsFor         null-safe stats for the metrics boxes —
 *                            draft rows carry null trees.
 *  - existingImageUrlFor    the stored-preview switch — clearing the
 *                            image hides the stored cover instantly
 *                            client-side, before the server
 *                            round-trip refreshes the course prop.
 *  - removeImageFlag        boolean to '1'/'0' so the payload always
 *                            passes the server's boolean rule.
 */
import { z } from 'zod';

export const COURSE_STATUSES = ['draft', 'published'];

export const MAX_IMAGE_MB = 2;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const buildCourseInfoSchema = ({ categories, hasExistingImage }) =>
    z
        .object({
            title: z
                .string()
                .trim()
                .min(1, 'Course title is required')
                .max(255, 'Course title is too long'),
            category: z.enum(categories, {
                error: 'Select a valid category',
            }),
            status: z.enum(COURSE_STATUSES),
            short_description: z
                .string()
                .trim()
                .min(1, 'Short description is required')
                .max(255, 'Short description is too long'),
            long_description: z
                .string()
                .trim()
                .min(1, 'Long description is required'),
            image: z
                .instanceof(File, {
                    message: 'Course image is required',
                })
                .refine((file) => file.size <= MAX_IMAGE_MB * 1024 * 1024, {
                    message: `Image must be smaller than ${MAX_IMAGE_MB} MB`,
                })
                .refine((file) => IMAGE_MIME_TYPES.includes(file.type), {
                    message: 'Image must be a JPEG, PNG, or WebP file',
                })
                .nullable(),
            remove_image: z.boolean(),
        })
        .superRefine((data, ctx) => {
            // The cover image is required unless one is already
            // stored and this save keeps it.
            if (!data.image && (!hasExistingImage || data.remove_image)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['image'],
                    message: 'Course image is required',
                });
            }
        });

/**
 * The metrics boxes' values — draft rows and fresh courses carry
 * null trees and null counters, so every field falls back to zero.
 */
export const courseStatsFor = (course) => {
    const modules = course?.modules ?? [];

    return {
        duration: course?.total_duration ?? 0,
        modulesCount: modules.length,
        lessonsCount: modules.reduce(
            (total, module) => total + (module?.lessons?.length ?? 0),
            0,
        ),
        points: course?.total_points ?? 0,
    };
};

/**
 * The stored cover's preview URL while this save keeps it.
 */
export const existingImageUrlFor = (removeImage, imageUrl) =>
    removeImage ? null : (imageUrl ?? null);

/**
 * The remove_image payload rides as a string so it always passes
 * the server's boolean rule.
 */
export const removeImageFlag = (removeImage) => (removeImage ? '1' : '0');
