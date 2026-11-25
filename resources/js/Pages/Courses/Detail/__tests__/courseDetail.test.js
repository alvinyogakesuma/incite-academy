/**
 * Course detail tests.
 *
 * Covers every decision in courseDetail.js:
 *
 *  progressSummaryFor
 *   D1  full sections → completed tally + per-type totals
 *   D2  null sections → zeros
 *   D3  section with null lessons → skipped safely
 *   D4  empty sections → all-zero summary
 *
 *  lessonIconTag
 *   D5  completed → 'completed' (regardless of type)
 *   D6  quiz → 'quiz'; the legacy 'practice' arm shares it
 *       (unreachable via current saves — documented)
 *   D7  exam → 'exam'
 *   D8  article / unknown type → 'article'
 *
 *  defaultOpenSection
 *   D9  the active lesson's section opens (string/number id
 *       coercion included)
 *   D10 no active lesson → the first section
 *   D11 empty sections → undefined
 *   D12 an active id that does not exist → the first section
 *
 *  sectionLessonsCount
 *   D13 explicit lessonsCount wins
 *   D14 falls back to the lessons array's length
 *   D15 neither → 0
 *
 *  shouldShowBadgeCard
 *   D16 badge data → the card shows (dormant: the show payload
 *       never ships one); absent badge / null course → hidden
 */
import { describe, it, expect } from 'vitest';
import {
    defaultOpenSection,
    lessonIconTag,
    progressSummaryFor,
    sectionLessonsCount,
    shouldShowBadgeCard,
} from '../courseDetail';

/** Mirrors the completedSections map shape. */
const SECTIONS = [
    {
        id: 1,
        title: 'Reading Fundamentals',
        lessonsCount: 2,
        lessons: [
            { id: 11, type: 'article', completed: true },
            { id: 12, type: 'quiz', completed: false },
        ],
    },
    {
        id: 2,
        title: 'Listening Practice',
        lessons: [
            { id: 21, type: 'quiz', completed: true },
            { id: 22, type: 'exam', completed: false },
        ],
    },
];

describe('progressSummaryFor', () => {
    it('D1 — full sections tally completed lessons per type', () => {
        expect(progressSummaryFor(SECTIONS)).toEqual({
            completedLessons: 2,
            progressData: [
                { label: 'Articles', total: 1, completed: 1 },
                { label: 'Quizzes', total: 2, completed: 1 },
                { label: 'Exams', total: 1, completed: 0 },
            ],
        });
    });

    it('D2 — null sections resolve to a zero summary', () => {
        expect(progressSummaryFor(null)).toEqual({
            completedLessons: 0,
            progressData: [
                { label: 'Articles', total: 0, completed: 0 },
                { label: 'Quizzes', total: 0, completed: 0 },
                { label: 'Exams', total: 0, completed: 0 },
            ],
        });
    });

    it('D3 — a section with null lessons is skipped safely', () => {
        const withNullLessons = [
            { id: 3, title: 'Empty Module', lessons: null },
        ];

        expect(progressSummaryFor(withNullLessons).completedLessons).toBe(0);
    });

    it('D4 — empty sections resolve to a zero summary', () => {
        expect(progressSummaryFor([]).completedLessons).toBe(0);
        expect(progressSummaryFor([]).progressData[0]).toEqual({
            label: 'Articles',
            total: 0,
            completed: 0,
        });
    });
});

describe('lessonIconTag', () => {
    it('D5 — completed rows check off regardless of type', () => {
        expect(lessonIconTag({ type: 'article', completed: true })).toBe(
            'completed',
        );
        expect(lessonIconTag({ type: 'exam', completed: true })).toBe(
            'completed',
        );
    });

    it("D6 — quizzes (and the legacy 'practice' arm) get the pencil", () => {
        expect(lessonIconTag({ type: 'quiz', completed: false })).toBe('quiz');

        // DD note: 'practice' rows can only come from the deprecated
        // app — current saves allow article/quiz/exam only.
        expect(lessonIconTag({ type: 'practice', completed: false })).toBe(
            'quiz',
        );
    });

    it('D7 — exams get the hourglass', () => {
        expect(lessonIconTag({ type: 'exam', completed: false })).toBe('exam');
    });

    it('D8 — articles and unknown types get the article glyph', () => {
        expect(lessonIconTag({ type: 'article', completed: false })).toBe(
            'article',
        );
        expect(lessonIconTag({ type: 'bogus', completed: false })).toBe(
            'article',
        );
    });
});

describe('defaultOpenSection', () => {
    it('D9 — the section holding the active lesson opens (ids coerce)', () => {
        expect(defaultOpenSection(SECTIONS, 22)).toBe('section-2');
        expect(defaultOpenSection(SECTIONS, '21')).toBe('section-2');
    });

    it('D10 — without an active lesson the first section opens', () => {
        expect(defaultOpenSection(SECTIONS, null)).toBe('section-1');
    });

    it('D11 — empty sections open nothing', () => {
        expect(defaultOpenSection([], 21)).toBeUndefined();
        expect(defaultOpenSection([], null)).toBeUndefined();
    });

    it('D12 — an active id that does not exist falls back to the first', () => {
        expect(defaultOpenSection(SECTIONS, 999)).toBe('section-1');
    });
});

describe('sectionLessonsCount', () => {
    it('D13 — an explicit lessonsCount wins over the array', () => {
        expect(
            sectionLessonsCount({
                lessonsCount: 7,
                lessons: [{}, {}],
            }),
        ).toBe(7);
    });

    it('D14 — without a count, the lessons array length applies', () => {
        expect(sectionLessonsCount({ lessons: [{}, {}, {}] })).toBe(3);
    });

    it('D15 — neither resolves to zero', () => {
        expect(sectionLessonsCount({})).toBe(0);
        expect(sectionLessonsCount({ lessons: null })).toBe(0);
    });
});

describe('shouldShowBadgeCard', () => {
    it('D16 — badge data shows the card; everything else hides it', () => {
        expect(shouldShowBadgeCard({ badge: { title: 'Scholar' } })).toBe(true);
        expect(shouldShowBadgeCard({ badge: undefined })).toBe(false);
        expect(shouldShowBadgeCard(null)).toBe(false);
    });
});
