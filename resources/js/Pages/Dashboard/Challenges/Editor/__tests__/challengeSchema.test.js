/**
 * Challenge schema tests.
 *
 * Covers every decision in challengeSchema.js:
 *
 *  buildChallengeSchema
 *   D1  title trim/min/max
 *   D2  description trim/min
 *   D3  category enum (dynamic per the page's categories prop)
 *   D4  difficulty enum (Easy/Medium/Hard)
 *   D5  points null → 'Enter the point reward'
 *   D6  points min(0) — zero is valid, negative is not
 *   D7  duration null → 'Enter the time limit in minutes'
 *   D8  duration min(1) — zero is not, one is
 *   D9  image instanceof File (File passes, non-File fails)
 *   D10 image size refine (at 2 MB passes, larger fails)
 *   D11 image MIME refine (jpeg/png/webp pass, gif fails)
 *   D12 image nullable (null passes the type rule itself)
 *   D13 image-required, fresh arm: no stored, no upload → error
 *   D14 image-required, kept arm: stored and kept → pass
 *   D15 image-required, removing arm: stored + remove → error
 *   D16 image-required, upload arm: fresh upload passes
 *   D17 questions OPTIONAL — a fresh challenge saves its metadata
 *       with zero questions (the contrast with the lesson editor's
 *       whole-payload questions rule)
 *   D18 answer-choice limits 2–6
 *   D19 question/answer row rules (type enum, required content)
 *   D20 listening audio is nullable (no duration field at all)
 */
import { describe, it, expect } from 'vitest';
import { MAX_IMAGE_MB, buildChallengeSchema } from '../challengeSchema';

const CATEGORIES = [
    'Reading Comprehension',
    'Listening Comprehension',
    'Structure and Writing Expression',
];

const makeImage = (type = 'image/png', bytes = 1024) =>
    new File([new ArrayBuffer(bytes)], 'cover.png', { type });

const makeAnswer = (overrides = {}) => ({
    stored_id: null,
    answer_content: 'Choice',
    is_correct: false,
    ...overrides,
});

const makeQuestion = (overrides = {}) => ({
    stored_id: null,
    type: 'text',
    question_content: 'Main idea?',
    audio: null,
    audio_url: null,
    remove_audio: false,
    answers: [makeAnswer(), makeAnswer({ is_correct: true })],
    ...overrides,
});

const baseForm = (overrides = {}) => ({
    title: 'Reading Sprint',
    description: 'Timed skimming drills',
    category: 'Reading Comprehension',
    difficulty: 'Easy',
    points: 40,
    duration: 15,
    image: makeImage(),
    remove_image: false,
    questions: [],
    ...overrides,
});

const freshSchema = () => buildChallengeSchema(CATEGORIES, false);

const storedSchema = () => buildChallengeSchema(CATEGORIES, true);

describe('buildChallengeSchema — metadata rules', () => {
    it('D1 — a trimmed title passes; blank and over-long fail', () => {
        const result = freshSchema().safeParse(baseForm({ title: '  Prep  ' }));

        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Prep');

        expect(
            freshSchema().safeParse(baseForm({ title: '   ' })).success,
        ).toBe(false);
        expect(
            freshSchema().safeParse(baseForm({ title: 'a'.repeat(256) }))
                .success,
        ).toBe(false);
    });

    it('D2 — a blank description fails', () => {
        expect(
            freshSchema().safeParse(baseForm({ description: '  ' })).success,
        ).toBe(false);
    });

    it('D3 — the category enum accepts a listed value and rejects an unlisted one', () => {
        expect(freshSchema().safeParse(baseForm()).success).toBe(true);
        expect(
            freshSchema().safeParse(baseForm({ category: 'Kedokteran' }))
                .success,
        ).toBe(false);
    });

    it('D4 — the difficulty enum accepts the three values only', () => {
        for (const difficulty of ['Easy', 'Medium', 'Hard']) {
            expect(
                freshSchema().safeParse(baseForm({ difficulty })).success,
            ).toBe(true);
        }

        expect(
            freshSchema().safeParse(baseForm({ difficulty: 'Expert' })).success,
        ).toBe(false);
    });
});

describe('buildChallengeSchema — points and duration', () => {
    it('D5 — a null points trips its own required message', () => {
        const result = freshSchema().safeParse(baseForm({ points: null }));

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe('Enter the point reward');
    });

    it('D6 — zero points is valid; negative is not', () => {
        expect(freshSchema().safeParse(baseForm({ points: 0 })).success).toBe(
            true,
        );
        expect(freshSchema().safeParse(baseForm({ points: -1 })).success).toBe(
            false,
        );
    });

    it('D7 — a null duration trips its own required message', () => {
        const result = freshSchema().safeParse(baseForm({ duration: null }));

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe(
            'Enter the time limit in minutes',
        );
    });

    it('D8 — a one-minute duration is the boundary; zero fails', () => {
        expect(freshSchema().safeParse(baseForm({ duration: 1 })).success).toBe(
            true,
        );
        expect(freshSchema().safeParse(baseForm({ duration: 0 })).success).toBe(
            false,
        );
    });
});

describe('buildChallengeSchema — image rule chain', () => {
    it('D9 — a File passes, a non-File fails', () => {
        expect(freshSchema().safeParse(baseForm()).success).toBe(true);
        expect(
            freshSchema().safeParse(baseForm({ image: 'cover.png' })).success,
        ).toBe(false);
    });

    it('D10 — an image at the size limit passes, a larger one fails', () => {
        expect(
            freshSchema().safeParse(
                baseForm({
                    image: makeImage('image/png', MAX_IMAGE_MB * 1024 * 1024),
                }),
            ).success,
        ).toBe(true);
        expect(
            freshSchema().safeParse(
                baseForm({
                    image: makeImage(
                        'image/png',
                        MAX_IMAGE_MB * 1024 * 1024 + 1,
                    ),
                }),
            ).success,
        ).toBe(false);
    });

    it('D11 — jpeg, png, and webp pass; a gif fails', () => {
        for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
            expect(
                freshSchema().safeParse(baseForm({ image: makeImage(type) }))
                    .success,
            ).toBe(true);
        }

        expect(
            freshSchema().safeParse(baseForm({ image: makeImage('image/gif') }))
                .success,
        ).toBe(false);
    });

    it('D12 — a null image passes the type rule itself', () => {
        // The nullable() arm — whether null is allowed at all is
        // decided by the image-required refinement, not the type.
        const result = storedSchema().safeParse(
            baseForm({ image: null, remove_image: false }),
        );

        expect(result.success).toBe(true);
    });
});

describe('buildChallengeSchema — the image-required decision', () => {
    it('D13 — a fresh challenge without an upload reports the image as required', () => {
        const result = freshSchema().safeParse(baseForm({ image: null }));

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('image');
    });

    it('D14 — a stored image kept by this save satisfies the rule', () => {
        expect(
            storedSchema().safeParse(baseForm({ image: null })).success,
        ).toBe(true);
    });

    it('D15 — a stored image removed by this save reports the image as required', () => {
        const result = storedSchema().safeParse(
            baseForm({ image: null, remove_image: true }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('image');
    });

    it('D16 — a fresh upload passes regardless of the stored state', () => {
        expect(freshSchema().safeParse(baseForm()).success).toBe(true);
        expect(
            storedSchema().safeParse(
                baseForm({ image: makeImage(), remove_image: true }),
            ).success,
        ).toBe(true);
    });
});

describe('buildChallengeSchema — questions', () => {
    it('D17 — a fresh challenge saves its metadata with zero questions', () => {
        // The contrast with the lesson editor: a fresh blank
        // challenge saves before any question exists.
        expect(
            freshSchema().safeParse(baseForm({ questions: [] })).success,
        ).toBe(true);
    });

    it('D18 — answer choices are bounded between 2 and 6', () => {
        // Below the minimum: a question with one choice fails.
        expect(
            freshSchema().safeParse(
                baseForm({
                    questions: [makeQuestion({ answers: [makeAnswer()] })],
                }),
            ).success,
        ).toBe(false);

        // Above the maximum: seven choices fail.
        expect(
            freshSchema().safeParse(
                baseForm({
                    questions: [
                        makeQuestion({
                            answers: [
                                ...Array.from({ length: 6 }, () =>
                                    makeAnswer(),
                                ),
                                makeAnswer(),
                            ],
                        }),
                    ],
                }),
            ).success,
        ).toBe(false);

        // Within the bounds passes.
        expect(
            freshSchema().safeParse(baseForm({ questions: [makeQuestion()] }))
                .success,
        ).toBe(true);
    });

    it('D19 — question content and answer choices are required', () => {
        const result = freshSchema().safeParse(
            baseForm({
                questions: [
                    makeQuestion({
                        question_content: '',
                        answers: [
                            makeAnswer({ answer_content: '' }),
                            makeAnswer(),
                        ],
                    }),
                ],
            }),
        );

        expect(result.success).toBe(false);

        const messages = result.error.issues.map((issue) => issue.message);

        expect(messages).toContain('Question text is required');
        expect(messages).toContain('Answer choice is required');
    });

    it('D20 — listening audio is nullable, and no audio_duration exists', () => {
        const result = freshSchema().safeParse(
            baseForm({
                questions: [
                    makeQuestion({
                        type: 'listening',
                        audio: null,
                    }),
                ],
            }),
        );

        expect(result.success).toBe(true);
        expect(result.data.questions[0]).not.toHaveProperty('audio_duration');
    });
});
