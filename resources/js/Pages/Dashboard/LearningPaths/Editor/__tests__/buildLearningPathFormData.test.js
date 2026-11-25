/**
 * buildLearningPathFormData tests.
 *
 * The builder is the wire-format contract: the course ids as a
 * flat array, files as-is, and booleans as '1'/'0' — and the
 * hydration owns the editor's defaults.
 *
 *  buildLearningPathFormData
 *   D1  every payload rides the method-spoofed PUT
 *   D2  metadata strings always ride
 *   D3  the cover image rides only when it is a File
 *   D4  remove_image rides as '1'/'0'
 *   D5  the course ids nest in the flat courses[] array
 *   D6  tolerant inputs — a missing slots array contributes
 *       nothing
 *
 *  initialLearningPathValues
 *   D7  a stored path hydrates every field with fallbacks
 *   D8  no path hydrates the blank defaults (defensive: the
 *       store flow seeds the row first, so the editor always
 *       receives a learning path)
 *   D9  the full fallback chain runs with an empty levels list
 */
import { describe, it, expect } from 'vitest';
import buildLearningPathFormData, {
    initialLearningPathValues,
} from '../buildLearningPathFormData';

const makeValues = (overrides = {}) => ({
    title: 'TOEFL Sprint Path',
    description: 'A timed journey through the basics',
    level: 'Beginner',
    image: null,
    remove_image: false,
    courses: [{ course_id: 11 }, { course_id: 22 }],
    ...overrides,
});

describe('buildLearningPathFormData', () => {
    it('D1 — the payload rides the method-spoofed PUT', () => {
        const data = buildLearningPathFormData(makeValues());

        expect(data.get('_method')).toBe('put');
        expect(data.get('title')).toBe('TOEFL Sprint Path');
    });

    it('D2 — metadata strings always ride', () => {
        const data = buildLearningPathFormData(makeValues());

        expect(data.get('description')).toBe(
            'A timed journey through the basics',
        );
        expect(data.get('level')).toBe('Beginner');
    });

    it('D3 — the cover image rides only when it is a File', () => {
        const withImage = makeValues({
            image: new File([new ArrayBuffer(8)], 'cover.png', {
                type: 'image/png',
            }),
        });

        expect(
            buildLearningPathFormData(withImage).get('image'),
        ).toBeInstanceOf(File);
        expect(buildLearningPathFormData(makeValues()).get('image')).toBeNull();
    });

    it("D4 — remove_image rides as '1'/'0'", () => {
        expect(
            buildLearningPathFormData(makeValues()).get('remove_image'),
        ).toBe('0');
        expect(
            buildLearningPathFormData(makeValues({ remove_image: true })).get(
                'remove_image',
            ),
        ).toBe('1');
    });

    it('D5 — the course ids nest in the flat courses[] array', () => {
        const data = buildLearningPathFormData(makeValues());

        // The flat wire: one courses[] entry per slot, the id
        // stringified (the contrast with the challenge editor's
        // bracket-nested question rows).
        expect(data.getAll('courses[]')).toEqual(['11', '22']);
    });

    it('D6 — tolerant inputs: a missing slots array contributes nothing', () => {
        const noCourses = buildLearningPathFormData(
            makeValues({ courses: undefined }),
        );

        expect(noCourses.getAll('courses[]')).toEqual([]);
    });
});

describe('initialLearningPathValues', () => {
    it('D7 — a stored path hydrates every field with fallbacks', () => {
        const values = initialLearningPathValues(
            {
                title: 'TOEFL Sprint Path',
                description: 'A timed journey through the basics',
                level: 'Advanced',
                courses: [{ id: 11 }, { id: 22 }],
            },
            ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
        );

        expect(values).toEqual({
            title: 'TOEFL Sprint Path',
            description: 'A timed journey through the basics',
            level: 'Advanced',
            image: null,
            remove_image: false,
            courses: [{ course_id: 11 }, { course_id: 22 }],
        });
    });

    it('D8 — no path hydrates the blank defaults', () => {
        // The `?.` guards are defensive: the store flow seeds the
        // row first, so the editor always receives a learning
        // path. Pinned as the current contract.
        expect(
            initialLearningPathValues(null, ['Beginner', 'All Levels']),
        ).toEqual({
            title: '',
            description: '',
            level: 'Beginner',
            image: null,
            remove_image: false,
            courses: [],
        });
    });

    it('D9 — the full fallback chain runs with an empty levels list', () => {
        const values = initialLearningPathValues(null, []);

        expect(values.level).toBe('All Levels');
    });
});
