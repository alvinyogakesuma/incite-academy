/**
 * Learning path sequence stats tests.
 *
 * Covers every outcome of sequenceStatsFor — the live tally the
 * editor's sidebar derives from the field array's slots and the
 * page's available courses:
 *
 *   D1  the happy path — the picked courses' combined duration
 *       and count
 *   D2  a null slots array contributes nothing (the ?? arm)
 *   D3  a bare slot drops out of the tally (the ?. arm)
 *   D4  a null course_id drops out of the tally (the != null
 *       filter arm)
 *   D5  a course carrying no duration sums as zero (the || 0
 *       arm); ids missing from the available courses are
 *       dropped from the count
 */
import { describe, it, expect } from 'vitest';
import { sequenceStatsFor } from '../learningPathStats';

/** Mirrors the Admin LearningPathController::edit map shape. */
const AVAILABLE_COURSES = [
    { id: 11, title: 'Grammar Foundations', duration: 120, modules: 4 },
    { id: 22, title: 'Reading Sprints', duration: 180, modules: 6 },
    { id: 33, title: 'Listening Immersion', duration: null, modules: 2 },
];

const SLOTS = [{ course_id: 11 }, { course_id: 22 }];

describe('sequenceStatsFor', () => {
    it('D1 — the picked courses tally their duration and count', () => {
        expect(sequenceStatsFor(SLOTS, AVAILABLE_COURSES)).toEqual({
            totalDuration: 300,
            coursesCount: 2,
        });
    });

    it('D2 — a null slots array contributes nothing', () => {
        expect(sequenceStatsFor(null, AVAILABLE_COURSES)).toEqual({
            totalDuration: 0,
            coursesCount: 0,
        });
    });

    it('D3 — a bare slot drops out of the tally', () => {
        // A freshly appended slot has no course_id yet.
        expect(sequenceStatsFor([...SLOTS, {}], AVAILABLE_COURSES)).toEqual({
            totalDuration: 300,
            coursesCount: 2,
        });
    });

    it('D4 — a null course_id drops out of the tally', () => {
        expect(
            sequenceStatsFor(
                [{ course_id: null }, ...SLOTS],
                AVAILABLE_COURSES,
            ),
        ).toEqual({
            totalDuration: 300,
            coursesCount: 2,
        });
    });

    it('D5 — a missing duration sums as zero; unknown ids drop out', () => {
        expect(
            sequenceStatsFor(
                [{ course_id: 11 }, { course_id: 33 }],
                AVAILABLE_COURSES,
            ),
        ).toEqual({
            totalDuration: 120,
            coursesCount: 2,
        });

        // An id the available list doesn't carry is dropped.
        expect(
            sequenceStatsFor([{ course_id: 99 }], AVAILABLE_COURSES),
        ).toEqual({
            totalDuration: 0,
            coursesCount: 0,
        });
    });
});
