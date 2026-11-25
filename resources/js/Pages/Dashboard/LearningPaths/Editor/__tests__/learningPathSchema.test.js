/**
 * Learning path schema tests.
 *
 * Covers every decision in learningPathSchema.js:
 *
 *  buildLearningPathSchema
 *   D1  title trim/min/max
 *   D2  description trim/min
 *   D3  level enum (the four LearningPath::LEVELS values)
 *   D4  image instanceof File (File passes, non-File fails)
 *   D5  image size refine (at 2 MB passes, larger fails)
 *   D6  image MIME refine (jpeg/png/webp pass, gif fails)
 *   D7  image nullable (null passes the type rule itself)
 *   D8  image-required, fresh arm: no stored, no upload → error
 *   D9  image-required, kept arm: stored and kept → pass
 *   D10 image-required, removing arm: stored + remove → error
 *   D11 image-required, upload arm: fresh upload passes
 *   D12 courses REQUIRED — the sequence needs at least one course
 *       (the mirror of the server's courses => min:1; the
 *       structural contrast with the challenge editor, whose
 *       questions are optional)
 *   D13 duplicate course detection — each course appears once
 *       (the mirror of the server's courses.* => distinct)
 *   D14 course_id number/int/positive — the blank slot's null
 *       fails its own 'Select a course' message
 *   D15 a fully valid payload passes
 */
import { describe, it, expect } from 'vitest';
import {
    LEVELS,
    MAX_IMAGE_MB,
    buildLearningPathSchema,
} from '../learningPathSchema';

const makeImage = (type = 'image/png', bytes = 1024) =>
    new File([new ArrayBuffer(bytes)], 'cover.png', { type });

const baseForm = (overrides = {}) => ({
    title: 'TOEFL Sprint Path',
    description: 'A timed journey through the basics',
    level: 'Beginner',
    image: makeImage(),
    remove_image: false,
    courses: [{ course_id: 11 }, { course_id: 22 }],
    ...overrides,
});

describe('buildLearningPathSchema — metadata rules', () => {
    it('D1 — a trimmed title passes; blank and over-long fail', () => {
        const result = buildLearningPathSchema(false).safeParse(
            baseForm({ title: '  Sprint  ' }),
        );

        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Sprint');

        expect(
            buildLearningPathSchema(false).safeParse(baseForm({ title: '   ' }))
                .success,
        ).toBe(false);
        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({ title: 'a'.repeat(256) }),
            ).success,
        ).toBe(false);
    });

    it('D2 — a blank description fails', () => {
        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({ description: '  ' }),
            ).success,
        ).toBe(false);
    });

    it('D3 — the level enum accepts the four values only', () => {
        for (const level of LEVELS) {
            expect(
                buildLearningPathSchema(false).safeParse(baseForm({ level }))
                    .success,
            ).toBe(true);
        }

        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({ level: 'Quantum Level' }),
            ).success,
        ).toBe(false);
    });
});

describe('buildLearningPathSchema — image rule chain', () => {
    it('D4 — a File passes, a non-File fails', () => {
        expect(
            buildLearningPathSchema(false).safeParse(baseForm()).success,
        ).toBe(true);
        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({ image: 'cover.png' }),
            ).success,
        ).toBe(false);
    });

    it('D5 — an image at the size limit passes, a larger one fails', () => {
        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({
                    image: makeImage('image/png', MAX_IMAGE_MB * 1024 * 1024),
                }),
            ).success,
        ).toBe(true);
        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({
                    image: makeImage(
                        'image/png',
                        MAX_IMAGE_MB * 1024 * 1024 + 1,
                    ),
                }),
            ).success,
        ).toBe(false);
    });

    it('D6 — jpeg, png, and webp pass; a gif fails', () => {
        for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
            expect(
                buildLearningPathSchema(false).safeParse(
                    baseForm({ image: makeImage(type) }),
                ).success,
            ).toBe(true);
        }

        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({ image: makeImage('image/gif') }),
            ).success,
        ).toBe(false);
    });

    it('D7 — a null image passes the type rule itself', () => {
        // The nullable() arm — whether null is allowed at all is
        // decided by the image-required refinement, not the type.
        expect(
            buildLearningPathSchema(true).safeParse(
                baseForm({ image: null, remove_image: false }),
            ).success,
        ).toBe(true);
    });
});

describe('buildLearningPathSchema — the image-required decision', () => {
    it('D8 — a fresh path without an upload reports the image as required', () => {
        const result = buildLearningPathSchema(false).safeParse(
            baseForm({ image: null }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('image');
    });

    it('D9 — a stored image kept by this save satisfies the rule', () => {
        expect(
            buildLearningPathSchema(true).safeParse(baseForm({ image: null }))
                .success,
        ).toBe(true);
    });

    it('D10 — a stored image removed by this save reports the image as required', () => {
        const result = buildLearningPathSchema(true).safeParse(
            baseForm({ image: null, remove_image: true }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('image');
    });

    it('D11 — a fresh upload passes regardless of the stored state', () => {
        expect(
            buildLearningPathSchema(false).safeParse(baseForm()).success,
        ).toBe(true);
        expect(
            buildLearningPathSchema(true).safeParse(
                baseForm({ image: makeImage(), remove_image: true }),
            ).success,
        ).toBe(true);
    });
});

describe('buildLearningPathSchema — the course sequence', () => {
    it('D12 — a sequence needs at least one course', () => {
        // The mirror of the server's courses => min:1 — and the
        // structural contrast with the challenge editor, whose
        // questions are optional.
        const result = buildLearningPathSchema(false).safeParse(
            baseForm({ courses: [] }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe(
            'Add at least one course to the sequence',
        );
    });

    it('D13 — each course appears once in the sequence', () => {
        // The mirror of the server's courses.* => distinct —
        // duplicates would collapse silently into the pivot.
        const result = buildLearningPathSchema(false).safeParse(
            baseForm({ courses: [{ course_id: 11 }, { course_id: 11 }] }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe(
            'Each course can only appear once in the sequence',
        );

        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({ courses: [{ course_id: 11 }, { course_id: 22 }] }),
            ).success,
        ).toBe(true);
    });

    it('D14 — the blank slot\u2019s null course_id trips its own message', () => {
        const result = buildLearningPathSchema(false).safeParse(
            baseForm({ courses: [{ course_id: null }, { course_id: 22 }] }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe('Select a course');

        // A non-integer or non-positive id fails the int/positive
        // rules.
        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({ courses: [{ course_id: 1.5 }] }),
            ).success,
        ).toBe(false);
        expect(
            buildLearningPathSchema(false).safeParse(
                baseForm({ courses: [{ course_id: 0 }] }),
            ).success,
        ).toBe(false);
    });

    it('D15 — a fully valid payload passes', () => {
        expect(
            buildLearningPathSchema(false).safeParse(baseForm()).success,
        ).toBe(true);
    });
});
