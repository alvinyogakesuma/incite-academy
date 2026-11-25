import { z } from 'zod';

export const LESSON_TYPES = ['article', 'quiz', 'exam'];

export const QUESTION_TYPES = ['text', 'listening'];

export const MIN_ANSWER_CHOICES = 2;

export const MAX_ANSWER_CHOICES = 6;

const answerChoiceSchema = z.object({
    // The stored answer's id — null marks a row created this edit.
    stored_id: z.number().nullable(),
    answer_content: z.string().trim().min(1, 'Answer choice is required'),
    is_true: z.boolean(),
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
    audio_duration: z.number().nullable(),
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

const baseLessonFields = {
    title: z
        .string()
        .trim()
        .min(1, 'Lesson title is required')
        .max(255, 'Lesson title is too long'),
    type: z.enum(LESSON_TYPES, { error: 'Select a valid type' }),
    duration: z.number().int().min(1).nullable(),
};

/**
 * The lesson editor's whole-payload schema, branch-aware: an
 * article validates its body, a quiz or exam validates the
 * question/answer tree. Rows of the inactive branch are stripped
 * by the parse, so stale questions never block an article save
 * and a half-written body never blocks a quiz save. Mirrors the
 * server's validation so both sides reject the same payloads.
 *
 * @param {'article'|'quiz'|'exam'} type
 */
export function buildLessonSchema(type) {
    if (type === 'article') {
        return z.object({
            ...baseLessonFields,
            article_content: z.string(),
        });
    }

    return z
        .object({
            ...baseLessonFields,
            questions: z.array(questionSchema),
        })
        .superRefine((lesson, ctx) => {
            // Exams carry their time limit; article and quiz
            // durations are derived from the content instead.
            if (lesson.type === 'exam' && lesson.duration == null) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['duration'],
                    message: 'Enter the exam time limit',
                });
            }
        });
}

/**
 * The schema for the lesson being validated — an unknown type
 * value falls back to the article schema so the resolver never
 * crashes on a stale type.
 *
 * @param {string} type
 * @param {Record<string, import('zod').ZodType>} schemas
 */
export function schemaForType(type, schemas) {
    return schemas[type] ?? schemas.article;
}
