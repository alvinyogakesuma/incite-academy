/**
 * Exam room tests.
 *
 * Covers every decision in examRoom.js:
 *
 *  examDurationSeconds
 *   D1  a stored limit converts to seconds; a falsy limit falls
 *       back to 60 minutes (the falsy-zero arm is unreachable via
 *       the schema's min(1) — documented)
 *
 *  mapExamQuestions
 *   D2  the payload maps into id/text option rows — no letters
 *       and no correctness flags (the answer key stays
 *       server-side); null-safe
 *
 *  answeredCountIn
 *   D3  selections count; undefined and null rows are skipped
 *
 *  examSubmitAnswers
 *   D4  only answered rows ride — skipped rows are omitted, not
 *       nulled (free navigation makes them reachable, and the
 *       backend's per-key required-integer rule tolerates missing
 *       keys while nulls would 422)
 *
 *  tickTimeLeft
 *   D5  ordinary seconds tick down; one second hits zero (the
 *       auto-submit signal)
 *
 *  formatClock
 *   D6  hours render "Xh MMm SSs"; sub-hour renders "MM:SS";
 *       zero renders "00:00"
 *
 *  examProgressPercent
 *   D7  the answered share; an empty exam resolves to zero
 *
 *  navigatorCellState
 *   D8  current wins, then answered, then the default
 *
 *  resultHeadline (reused from quizRoom)
 *   D9  100 → 'Perfect Score!'; anything else → 'Great Effort!'
 */
import { describe, it, expect } from 'vitest';
import {
    answeredCountIn,
    examDurationSeconds,
    examProgressPercent,
    examSubmitAnswers,
    formatClock,
    mapExamQuestions,
    navigatorCellState,
    tickTimeLeft,
} from '../examRoom';
import { resultHeadline } from '../../RoomQuiz/quizRoom';

/** Mirrors the takeLesson payload shape (exam: no correctness). */
const QUESTIONS = [
    {
        id: 301,
        type: 'text',
        question_content: 'Structure one?',
        answers: [
            { id: 401, answer_content: 'A' },
            { id: 402, answer_content: 'B' },
        ],
    },
    {
        id: 302,
        type: 'text',
        question_content: 'Structure two?',
        answers: [{ id: 403, answer_content: 'C' }],
    },
];

describe('examDurationSeconds', () => {
    it('D1 — a stored limit converts to seconds', () => {
        expect(examDurationSeconds(45)).toBe(45 * 60);
    });

    it('D1 — a falsy limit falls back to 60 minutes', () => {
        expect(examDurationSeconds(null)).toBe(60 * 60);
        expect(examDurationSeconds(undefined)).toBe(60 * 60);
        expect(examDurationSeconds(0)).toBe(60 * 60);
    });
});

describe('mapExamQuestions', () => {
    it('D2 — the payload maps into id/text option rows', () => {
        const mapped = mapExamQuestions(QUESTIONS);

        expect(mapped[0].options).toEqual([
            { id: 401, text: 'A' },
            { id: 402, text: 'B' },
        ]);
    });

    it('D2 — the exam never receives the correctness flags', () => {
        const mapped = mapExamQuestions(QUESTIONS);

        expect(
            mapped.some((question) =>
                question.options.some((option) => 'isCorrect' in option),
            ),
        ).toBe(false);
    });

    it('D2 — a missing payload and bare answers are null-safe', () => {
        expect(mapExamQuestions(null)).toEqual([]);
        expect(mapExamQuestions([{ id: 9 }])).toEqual([{ id: 9, options: [] }]);
    });
});

describe('answeredCountIn', () => {
    it('D3 — selections count, gaps do not', () => {
        expect(answeredCountIn({ 0: 401, 1: undefined, 2: null, 3: 403 })).toBe(
            2,
        );
    });

    it('D3 — an empty selection counts zero', () => {
        expect(answeredCountIn({})).toBe(0);
    });
});

describe('examSubmitAnswers', () => {
    it('D4 — answered rows ride with their answer ids', () => {
        const answers = examSubmitAnswers(
            QUESTIONS.map((q) => ({ id: q.id })),
            {
                0: 401,
                1: 403,
            },
        );

        expect(answers).toEqual({ 301: 401, 302: 403 });
    });

    it('D4 — skipped rows are omitted entirely, never nulled', () => {
        const answers = examSubmitAnswers(
            QUESTIONS.map((q) => ({ id: q.id })),
            { 0: 401 },
        );

        expect(answers[301]).toBe(401);
        expect(302 in answers).toBe(false);
    });

    it('D4 — an empty selection submits an empty map', () => {
        expect(
            examSubmitAnswers(
                QUESTIONS.map((q) => ({ id: q.id })),
                {},
            ),
        ).toEqual({});
    });
});

describe('tickTimeLeft', () => {
    it('D5 — ordinary seconds tick down', () => {
        expect(tickTimeLeft(45)).toBe(44);
    });

    it('D5 — one second hits zero, the auto-submit signal', () => {
        expect(tickTimeLeft(1)).toBe(0);
        expect(tickTimeLeft(0)).toBe(0);
    });
});

describe('formatClock', () => {
    it('D6 — an hour-plus renders hours, minutes, and seconds', () => {
        expect(formatClock(3930)).toBe('1h 05m 30s');
    });

    it('D6 — sub-hour renders minutes and seconds, zero-padded', () => {
        expect(formatClock(2730)).toBe('45:30');
        expect(formatClock(59)).toBe('00:59');
    });

    it('D6 — zero renders 00:00', () => {
        expect(formatClock(0)).toBe('00:00');
    });
});

describe('examProgressPercent', () => {
    it('D7 — the answered share of the exam', () => {
        expect(examProgressPercent(2, 4)).toBe(50);
        expect(examProgressPercent(4, 4)).toBe(100);
    });

    it('D7 — an empty exam resolves to zero', () => {
        expect(examProgressPercent(0, 0)).toBe(0);
    });
});

describe('navigatorCellState', () => {
    it('D8 — the current row wins over everything', () => {
        expect(navigatorCellState({ isCurrent: true, isAnswered: true })).toBe(
            'current',
        );
    });

    it('D8 — an answered row falls back to answered', () => {
        expect(navigatorCellState({ isCurrent: false, isAnswered: true })).toBe(
            'answered',
        );
    });

    it('D8 — an unselected row stays default', () => {
        expect(
            navigatorCellState({ isCurrent: false, isAnswered: false }),
        ).toBe('default');
    });
});

describe('resultHeadline (reused from quizRoom)', () => {
    it('D9 — a perfect score celebrates, the rest credit the effort', () => {
        expect(resultHeadline(100)).toBe('Perfect Score!');
        expect(resultHeadline(80)).toBe('Great Effort!');
    });
});
