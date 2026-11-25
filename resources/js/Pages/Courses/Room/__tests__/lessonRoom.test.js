/**
 * Lesson room tests.
 *
 * Covers every decision in lessonRoom.js:
 *
 *  articleBodyFor
 *   D1  content renders; empty / null content shows the
 *       prepared-content placeholder
 *
 *  flatLessonsIn
 *   D2  null sections / null lesson arrays → empty; full → flattened
 *
 *  activeLessonContext
 *   D3  the active lesson resolves to its index and itself
 *   D4  an unknown id resolves to an inactive context
 *   D5  boundaries: the first row has no previous; the last has no
 *       next; a single lesson has neither
 *
 *  previousLessonId
 *   D6  the previous row's id, or null on the first row
 *
 *  nextVisitUrl
 *   D7  the next lesson's room, or the course page on the last
 *       row (the Finish Course arm)
 *
 *  roomTitleFor
 *   D8  the lesson title, falling back to 'Lesson' for an
 *       unknown row
 *
 *  nextButtonLabel / reviewedLabel
 *   D9  'Next' vs 'Finish Course'
 *   D10 'Reviewed' vs 'Mark as Reviewed'
 */
import { describe, it, expect } from 'vitest';
import {
    activeLessonContext,
    articleBodyFor,
    flatLessonsIn,
    nextButtonLabel,
    nextVisitUrl,
    previousLessonId,
    roomTitleFor,
    reviewedLabel,
} from '../lessonRoom';

/** Mirrors the completedSections map shape. */
const SECTIONS = [
    {
        id: 1,
        title: 'Reading Fundamentals',
        lessons: [{ id: 11, title: 'Reading Basics' }, { id: 12 }],
    },
    {
        id: 2,
        title: 'Listening Practice',
        lessons: [{ id: 21, title: 'Diction' }],
    },
];

describe('articleBodyFor', () => {
    it('D1 — the article body renders as-is', () => {
        expect(articleBodyFor({ article_content: '<p>Real body</p>' })).toBe(
            '<p>Real body</p>',
        );
    });

    it('D1 — empty and null content show the prepared placeholder', () => {
        const placeholder =
            '<p class="text-neutral-500 italic">This lesson\'s content is being prepared.</p>';

        expect(articleBodyFor({ article_content: '' })).toBe(placeholder);
        expect(articleBodyFor({ article_content: null })).toBe(placeholder);
    });
});

describe('flatLessonsIn', () => {
    it('D2 — full sections flatten in order', () => {
        expect(flatLessonsIn(SECTIONS).map((lesson) => lesson.id)).toEqual([
            11, 12, 21,
        ]);
    });

    it('D2 — null sections and null lesson arrays resolve to empty', () => {
        expect(flatLessonsIn(null)).toEqual([]);
        expect(flatLessonsIn([{ id: 1, lessons: null }])).toEqual([]);
    });
});

describe('activeLessonContext', () => {
    it('D3 — the active lesson resolves to its index and itself', () => {
        const context = activeLessonContext(flatLessonsIn(SECTIONS), 12);

        expect(context.activeIndex).toBe(1);
        expect(context.activeLesson.id).toBe(12);
        expect(context.hasPrevious).toBe(true);
        expect(context.hasNext).toBe(true);
    });

    it('D4 — an unknown id resolves to an inactive context', () => {
        const context = activeLessonContext(flatLessonsIn(SECTIONS), 999);

        expect(context.activeIndex).toBe(-1);
        expect(context.activeLesson).toBeNull();
        expect(context.hasPrevious).toBe(false);
        expect(context.hasNext).toBe(false);
    });

    it('D5 — the first row has no previous', () => {
        const context = activeLessonContext(flatLessonsIn(SECTIONS), 11);

        expect(context.hasPrevious).toBe(false);
        expect(context.hasNext).toBe(true);
    });

    it('D5 — the last row has no next', () => {
        const context = activeLessonContext(flatLessonsIn(SECTIONS), 21);

        expect(context.hasPrevious).toBe(true);
        expect(context.hasNext).toBe(false);
    });

    it('D5 — a single-lesson room has neither boundary', () => {
        const context = activeLessonContext(
            flatLessonsIn([{ id: 1, lessons: [{ id: 11 }] }]),
            11,
        );

        expect(context.hasPrevious).toBe(false);
        expect(context.hasNext).toBe(false);
    });
});

describe('previousLessonId', () => {
    it('D6 — the previous row resolves from the active index', () => {
        expect(previousLessonId(flatLessonsIn(SECTIONS), 1)).toBe(11);
    });

    it('D6 — the first row has no previous', () => {
        expect(previousLessonId(flatLessonsIn(SECTIONS), 0)).toBeNull();
    });
});

describe('nextVisitUrl', () => {
    const flat = flatLessonsIn(SECTIONS);

    it('D7 — the next lesson is its own room', () => {
        expect(nextVisitUrl('reading-course', flat, 0)).toBe(
            '/courses/reading-course/lessons/12',
        );
    });

    it('D7 — the last row finishes into the course detail page', () => {
        expect(nextVisitUrl('reading-course', flat, 2)).toBe(
            '/courses/reading-course',
        );
    });
});

describe('roomTitleFor', () => {
    it('D8 — the active lesson titles the tab', () => {
        expect(roomTitleFor({ title: 'Diction' }, 'Reading Course')).toBe(
            'Diction - Reading Course',
        );
    });

    it('D8 — an unknown row falls back to Lesson', () => {
        expect(roomTitleFor(null, 'Reading Course')).toBe(
            'Lesson - Reading Course',
        );
    });
});

describe('nextButtonLabel / reviewedLabel', () => {
    it("D9 — 'Next' for ordinary rows, 'Finish Course' on the last", () => {
        expect(nextButtonLabel(true)).toBe('Next');
        expect(nextButtonLabel(false)).toBe('Finish Course');
    });

    it("D10 — 'Reviewed' on completed rows, 'Mark as Reviewed' otherwise", () => {
        expect(reviewedLabel(true)).toBe('Reviewed');
        expect(reviewedLabel(false)).toBe('Mark as Reviewed');
    });
});
