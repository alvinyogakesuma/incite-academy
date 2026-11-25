/**
 * Course editor information-panel tests.
 *
 * Covers every decision in courseInfo.js:
 *
 *  buildCourseInfoSchema
 *   D1  title trim/min/max
 *   D2  short_description trim/min/max
 *   D3  long_description min
 *   D4  category enum (dynamic per the page's categories prop)
 *   D5  status enum (draft/published)
 *   D6  image instanceof File (File passes, non-File fails)
 *   D7  image size refine (<= 2 MB passes, larger fails)
 *   D8  image MIME refine (jpeg/png/webp pass, gif fails)
 *   D9  image nullable (null passes the type rule)
 *   D10 image-required decision, fresh course arm:
 *       no stored image + no upload → required error
 *   D11 image-required decision, kept arm:
 *       stored image + keeping it → pass
 *   D12 image-required decision, removing arm:
 *       stored image + remove_image → required error
 *   D13 image-required decision, upload arm:
 *       a new upload passes regardless of stored state
 *   D14 empty categories probe (schema must not throw at build
 *       time when the category list is empty)
 *
 *  courseStatsFor
 *   D15 full course → real counts
 *   D16 null course / null lesson trees → zero fallbacks
 *
 *  existingImageUrlFor
 *   D17 removing → null preview; keeping → the stored url;
 *       missing url → null
 *
 *  removeImageFlag
 *   D18 true → '1', false → '0'
 */
import { describe, it, expect } from 'vitest';
import {
    MAX_IMAGE_MB,
    buildCourseInfoSchema,
    courseStatsFor,
    existingImageUrlFor,
    removeImageFlag,
} from '../courseInfo';

const CATEGORIES = [
    'Reading Comprehension',
    'Listening Comprehension',
    'Structure and Writing Expression',
];

const makeImage = (type = 'image/png', bytes = 1024) =>
    new File([new ArrayBuffer(bytes)], 'cover.png', { type });

const baseForm = (overrides = {}) => ({
    title: 'TOEFL Preparation',
    category: 'Reading Comprehension',
    status: 'draft',
    short_description: 'A complete prep course',
    long_description: 'Reading, listening, and structure tracks.',
    image: makeImage(),
    remove_image: false,
    ...overrides,
});

const freshSchema = () =>
    buildCourseInfoSchema({ categories: CATEGORIES, hasExistingImage: false });

const storedSchema = () =>
    buildCourseInfoSchema({ categories: CATEGORIES, hasExistingImage: true });

describe('buildCourseInfoSchema — metadata rules', () => {
    it('D1 — a trimmed title under the limits passes', () => {
        const result = freshSchema().safeParse(baseForm({ title: '  Prep  ' }));

        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Prep');
    });

    it('D1 — a blank or over-long title fails', () => {
        expect(
            freshSchema().safeParse(baseForm({ title: '   ' })).success,
        ).toBe(false);
        expect(
            freshSchema().safeParse(baseForm({ title: 'a'.repeat(256) }))
                .success,
        ).toBe(false);
    });

    it('D2 — a blank or over-long short description fails', () => {
        expect(
            freshSchema().safeParse(baseForm({ short_description: ' ' }))
                .success,
        ).toBe(false);
        expect(
            freshSchema().safeParse(
                baseForm({ short_description: 'a'.repeat(256) }),
            ).success,
        ).toBe(false);
    });

    it('D3 — a blank long description fails', () => {
        expect(
            freshSchema().safeParse(baseForm({ long_description: '' })).success,
        ).toBe(false);
    });

    it('D4 — the category enum accepts a listed value and rejects an unlisted one', () => {
        expect(freshSchema().safeParse(baseForm()).success).toBe(true);
        expect(
            freshSchema().safeParse(baseForm({ category: 'Kedokteran' }))
                .success,
        ).toBe(false);
    });

    it('D5 — the status enum accepts draft and published only', () => {
        expect(
            freshSchema().safeParse(baseForm({ status: 'published' })).success,
        ).toBe(true);
        expect(
            freshSchema().safeParse(baseForm({ status: 'archived' })).success,
        ).toBe(false);
    });
});

describe('buildCourseInfoSchema — image rule chain', () => {
    it('D6 — a File passes, a non-File fails', () => {
        expect(freshSchema().safeParse(baseForm()).success).toBe(true);
        expect(
            freshSchema().safeParse(baseForm({ image: 'course.png' })).success,
        ).toBe(false);
    });

    it('D7 — an image at the size limit passes, a larger one fails', () => {
        expect(
            freshSchema().safeParse(
                baseForm({ image: makeImage('image/png', 2 * 1024 * 1024) }),
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

    it('D8 — jpeg, png, and webp pass; a gif fails', () => {
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

    it('D9 — a null image passes the type rule itself', () => {
        // The nullable() arm — whether null is allowed at all is
        // decided by the image-required refinement, not the type.
        const result = storedSchema().safeParse(
            baseForm({ image: null, remove_image: false }),
        );

        expect(result.success).toBe(true);
    });
});

describe('buildCourseInfoSchema — the image-required decision', () => {
    it('D10 — a fresh course without an upload reports the image as required', () => {
        const result = freshSchema().safeParse(baseForm({ image: null }));

        expect(result.success).toBe(false);
        expect(
            result.error.issues.some(
                (issue) =>
                    issue.path.includes('image') &&
                    issue.message === 'Course image is required',
            ),
        ).toBe(true);
    });

    it('D11 — a stored image kept by this save satisfies the rule', () => {
        expect(
            storedSchema().safeParse(baseForm({ image: null })).success,
        ).toBe(true);
    });

    it('D12 — a stored image removed by this save reports the image as required', () => {
        const result = storedSchema().safeParse(
            baseForm({ image: null, remove_image: true }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toContain('image');
    });

    it('D13 — a fresh upload passes regardless of the stored state', () => {
        expect(freshSchema().safeParse(baseForm()).success).toBe(true);
        expect(
            storedSchema().safeParse(
                baseForm({ image: makeImage(), remove_image: true }),
            ).success,
        ).toBe(true);
    });
});

describe('buildCourseInfoSchema — empty categories probe', () => {
    it('D14 — an empty category list must not throw at build time', () => {
        // The page defaults categories to [], so the schema factory
        // must tolerate it (the backend always sends the three
        // categories in practice).
        expect(() =>
            buildCourseInfoSchema({ categories: [], hasExistingImage: false }),
        ).not.toThrow();
    });
});

describe('courseStatsFor', () => {
    it('D15 — a full course counts its modules and lessons', () => {
        const stats = courseStatsFor({
            total_duration: 125,
            total_points: 100,
            modules: [{ lessons: [{}, {}] }, { lessons: [{}] }, {}],
        });

        expect(stats).toEqual({
            duration: 125,
            modulesCount: 3,
            lessonsCount: 3,
            points: 100,
        });
    });

    it('D16 — a null course and null lesson trees fall back to zero', () => {
        expect(courseStatsFor(null)).toEqual({
            duration: 0,
            modulesCount: 0,
            lessonsCount: 0,
            points: 0,
        });

        expect(
            courseStatsFor({ modules: [{ lessons: null }, null] }).lessonsCount,
        ).toBe(0);
    });
});

describe('existingImageUrlFor', () => {
    it('D17 — removing hides the stored preview, keeping shows it', () => {
        expect(
            existingImageUrlFor(true, '/storage/courses/cover.png'),
        ).toBeNull();
        expect(existingImageUrlFor(false, '/storage/courses/cover.png')).toBe(
            '/storage/courses/cover.png',
        );
        expect(existingImageUrlFor(false, null)).toBeNull();
    });
});

describe('removeImageFlag', () => {
    it("D18 — the flag rides as '1' or '0'", () => {
        expect(removeImageFlag(true)).toBe('1');
        expect(removeImageFlag(false)).toBe('0');
    });
});
