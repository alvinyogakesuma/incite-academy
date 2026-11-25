/**
 * lessonSchema tests.
 *
 * The schema is branch-aware — an article validates its body, a
 * quiz or exam validates the question/answer tree — and mirrors
 * the server's attribute rules. The tests pin both branch
 * contracts, the per-field rules, and the branch stripping that
 * keeps stale rows of the inactive branch from blocking a save.
 * Content guards (article words, listening audio, correct-answer
 * marking) are deliberately absent on both sides — the inverted
 * contracts below document that permissiveness.
 *
 *  D1  article: a body without words saves
 *  D2  article: stale question rows never block an article save
 *  D3  quiz: question text and answer choices are required
 *  D4  quiz: any correct-answer marking is accepted
 *  D5  quiz: answers stay within the 2–6 choice limits
 *  D6  listening: questions without audio save
 *  D7  exam: the time limit is required
 *  D8  a full quiz payload passes end to end
 *
 *  schemaForType
 *   D9  a known type resolves to its schema; an unknown type falls
 *       back to the article schema so the resolver never crashes
 *       on a stale type
 */
import { describe, it, expect } from 'vitest';
import { buildLessonSchema, schemaForType } from '../lessonSchema';

const makeAnswer = (content, isTrue = false) => ({
    stored_id: null,
    answer_content: content,
    is_true: isTrue,
});

const makeQuestion = (overrides = {}) => ({
    stored_id: null,
    type: 'text',
    question_content: 'What is the main idea?',
    audio: null,
    audio_url: null,
    audio_duration: null,
    remove_audio: false,
    answers: [makeAnswer('Wrong'), makeAnswer('Right', true)],
    ...overrides,
});

const baseLesson = {
    title: 'Skimming Basics',
    duration: null,
};

describe('lessonSchema', () => {
    it('D1 — an article body without words saves', () => {
        const result = buildLessonSchema('article').safeParse({
            ...baseLesson,
            type: 'article',
            // The WYSIWYG's empty document — markup without words.
            article_content: '<p></p>',
        });

        expect(result.success).toBe(true);
    });

    it('D2 — stale question rows never block an article save', () => {
        const result = buildLessonSchema('article').safeParse({
            ...baseLesson,
            type: 'article',
            article_content: '<p>Real article body</p>',
            // An incomplete leftover tree from a quiz switch.
            questions: [makeQuestion({ question_content: '' })],
        });

        expect(result.success).toBe(true);
    });

    it('D3 — question text and answer choices are required', () => {
        const result = buildLessonSchema('quiz').safeParse({
            ...baseLesson,
            type: 'quiz',
            questions: [
                makeQuestion({
                    question_content: '',
                    answers: [makeAnswer(''), makeAnswer('Right', true)],
                }),
            ],
        });

        expect(result.success).toBe(false);

        const messages = result.error.issues.map((issue) => issue.message);

        expect(messages).toContain('Question text is required');
        expect(messages).toContain('Answer choice is required');
    });

    it('D4 — any correct-answer marking is accepted', () => {
        const schema = buildLessonSchema('quiz');

        // Zero correct answers.
        expect(
            schema.safeParse({
                ...baseLesson,
                type: 'quiz',
                questions: [
                    makeQuestion({
                        answers: [
                            makeAnswer('Wrong'),
                            makeAnswer('Also wrong'),
                        ],
                    }),
                ],
            }).success,
        ).toBe(true);

        // Two correct answers.
        expect(
            schema.safeParse({
                ...baseLesson,
                type: 'quiz',
                questions: [
                    makeQuestion({
                        answers: [
                            makeAnswer('Right', true),
                            makeAnswer('Also right', true),
                        ],
                    }),
                ],
            }).success,
        ).toBe(true);
    });

    it('D5 — answers stay within the 2–6 choice limits', () => {
        const schema = buildLessonSchema('quiz');

        const one = schema.safeParse({
            ...baseLesson,
            type: 'quiz',
            questions: [makeQuestion({ answers: [makeAnswer('Only one')] })],
        });

        expect(one.success).toBe(false);
        expect(one.error.issues[0].message).toBe(
            'At least 2 answer choices are required',
        );

        const seven = schema.safeParse({
            ...baseLesson,
            type: 'quiz',
            questions: [
                makeQuestion({
                    answers: Array.from({ length: 7 }, (_, index) =>
                        makeAnswer(`Choice ${index + 1}`, index === 0),
                    ),
                }),
            ],
        });

        expect(seven.success).toBe(false);
        expect(seven.error.issues[0].message).toBe(
            'At most 6 answer choices are allowed',
        );
    });

    it('D6 — listening questions without audio save', () => {
        const result = buildLessonSchema('quiz').safeParse({
            ...baseLesson,
            type: 'quiz',
            questions: [makeQuestion({ type: 'listening' })],
        });

        expect(result.success).toBe(true);
    });

    it('D7 — exams require a time limit', () => {
        const schema = buildLessonSchema('exam');

        const missing = schema.safeParse({
            ...baseLesson,
            type: 'exam',
            duration: null,
            questions: [],
        });

        expect(missing.success).toBe(false);
        expect(missing.error.issues[0].message).toBe(
            'Enter the exam time limit',
        );

        expect(
            schema.safeParse({
                ...baseLesson,
                type: 'exam',
                duration: 30,
                questions: [],
            }).success,
        ).toBe(true);
    });

    it('D8 — a full quiz payload passes end to end', () => {
        const result = buildLessonSchema('quiz').safeParse({
            ...baseLesson,
            type: 'quiz',
            questions: [
                makeQuestion(),
                makeQuestion({
                    type: 'listening',
                    audio: new File(['clip'], 'clip.mp3', {
                        type: 'audio/mpeg',
                    }),
                    audio_duration: 30,
                }),
            ],
        });

        expect(result.success).toBe(true);
    });
});

describe('schemaForType', () => {
    const schemas = {
        article: buildLessonSchema('article'),
        quiz: buildLessonSchema('quiz'),
        exam: buildLessonSchema('exam'),
    };

    it('D9: a known type resolves to its own schema', () => {
        expect(schemaForType('quiz', schemas)).toBe(schemas.quiz);
        expect(schemaForType('exam', schemas)).toBe(schemas.exam);
    });

    it('D9: an unknown type falls back to the article schema', () => {
        expect(schemaForType('stale', schemas)).toBe(schemas.article);
    });
});
