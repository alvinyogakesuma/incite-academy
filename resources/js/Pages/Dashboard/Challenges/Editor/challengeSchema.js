import { z } from 'zod';

export const QUESTION_TYPES = ['text', 'listening'];

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export const MIN_ANSWER_CHOICES = 2;

export const MAX_ANSWER_CHOICES = 6;

export const MAX_IMAGE_MB = 2;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const answerChoiceSchema = z.object({
    // The stored answer's id — null marks a row created this edit.
    stored_id: z.number().nullable(),
    answer_content: z.string().trim().min(1, 'Answer choice is required'),
    is_correct: z.boolean(),
});

const questionSchema = z.object({
    // The stored question's id — null marks a row created this edit.
    stored_id: z.number().nullable(),
    type: z.enum(QUESTION_TYPES, {
        error: 'Select a valid question type',
    }),
    question_content: z.string().trim().min(1, 'Question text is required'),
    // New uploads only — the stored file is tracked by audio_url.
    audio: z.instanceof(File, { message: 'Audio file is required' }).nullable(),
    audio_url: z.string().nullable(),
    remove_audio: z.boolean(),
    answers: z
        .array(answerChoiceSchema)
        .min(
            MIN_ANSWER_CHOICES,
            `At least ${MIN_ANSWER_CHOICES} answer choices are required`,
        )
        .max(
            MAX_ANSWER_CHOICES,
            `At most ${MAX_ANSWER_CHOICES} answer choices are allowed`,
        ),
});

/**
 * The challenge editor's whole-payload schema — metadata, the
 * cover image, and the question/answer tree. Mirrors the server's
 * validation so both sides reject the same payloads. Questions
 * are optional: a fresh blank challenge saves its metadata before
 * any question exists.
 *
 * @param {string[]} categories
 * @param {boolean} hasExistingImage
 */
export function buildChallengeSchema(categories, hasExistingImage) {
    return z
        .object({
            title: z
                .string()
                .trim()
                .min(1, 'Challenge title is required')
                .max(255, 'Challenge title is too long'),
            description: z.string().trim().min(1, 'Description is required'),
            category: z.enum(categories, {
                error: 'Select a valid category',
            }),
            difficulty: z.enum(DIFFICULTIES, {
                error: 'Select a difficulty',
            }),
            points: z
                .number()
                .int()
                .min(0, 'Points must be zero or more')
                .nullable(),
            duration: z
                .number()
                .int()
                .min(1, 'Enter the time limit in minutes')
                .nullable(),
            image: z
                .instanceof(File, {
                    message: 'Challenge image is required',
                })
                .refine((file) => file.size <= MAX_IMAGE_MB * 1024 * 1024, {
                    message: `Image must be smaller than ${MAX_IMAGE_MB} MB`,
                })
                .refine((file) => IMAGE_MIME_TYPES.includes(file.type), {
                    message: 'Image must be a JPEG, PNG, or WebP file',
                })
                .nullable(),
            remove_image: z.boolean(),
            questions: z.array(questionSchema),
        })
        .superRefine((challenge, ctx) => {
            // Empty number inputs arrive as null — both fields are
            // required, with their own messages.
            if (challenge.points == null) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['points'],
                    message: 'Enter the point reward',
                });
            }

            if (challenge.duration == null) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['duration'],
                    message: 'Enter the time limit in minutes',
                });
            }

            // The cover image is required unless one is already
            // stored and this save keeps it.
            if (
                !challenge.image &&
                (!hasExistingImage || challenge.remove_image)
            ) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['image'],
                    message: 'Challenge image is required',
                });
            }
        });
}
