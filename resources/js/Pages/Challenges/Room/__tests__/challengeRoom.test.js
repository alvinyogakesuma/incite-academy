/**
 * Challenge room tests.
 *
 * Covers the page's own decision (challengeDurationSeconds) and
 * pins the exam-room helper reuse on this page's payload:
 *
 *  challengeDurationSeconds
 *   D1  a stored limit converts to seconds; a falsy limit falls
 *       back to 15 minutes (the falsy-zero arm is unreachable via
 *       the admin's duration validation — documented)
 *
 *  mapExamQuestions (reused from examRoom)
 *   D2  the challenge payload maps into id/text option rows — no
 *       letters and no correctness flags (the answer key never
 *       ships); null-safe
 *
 *  answeredCountIn (reused)
 *   D3  selections count; undefined and null rows are skipped
 *
 *  examSubmitAnswers (reused)
 *   D4  only answered rows ride — skipped rows are omitted, never
 *       nulled (the backend validates the same per-key
 *       required-integer rule as the exam, and the free
 *       navigation makes skipped rows reachable)
 *
 *  tickTimeLeft / formatClock / examProgressPercent (reused)
 *   D5  the countdown tick — one second hits zero (auto-submit)
 *   D6  the clock — hour arm, sub-hour padding, zero
 *   D7  the progress share; empty → zero
 *
 *  navigatorCellState (reused)
 *   D8  current wins, then answered, then default
 *
 *  resultHeadline (reused from quizRoom)
 *   D9  100 → 'Perfect Score!'; anything else → 'Great Effort!'
 */
import { describe, it, expect } from 'vitest';
import {
    answeredCountIn,
    examProgressPercent,
    examSubmitAnswers,
    formatClock,
    mapExamQuestions,
    navigatorCellState,
    tickTimeLeft,
} from '@/Pages/Courses/RoomExam/examRoom';
import { resultHeadline } from '@/Pages/Courses/RoomQuiz/quizRoom';
import { challengeDurationSeconds } from '../challengeRoom';

/** Mirrors the ChallengeController::take payload shape (no flags). */
const QUESTIONS = [
    {
        id: 501,
        type: 'text',
        question_content: 'Sprint one?',
        answers: [
            { id: 601, answer_content: 'A' },
            { id: 602, answer_content: 'B' },
        ],
    },
    {
        id: 502,
        type: 'listening',
        question_content: 'Sprint two?',
        answers: [{ id: 603, answer_content: 'C' }],
    },
];

describe('challengeDurationSeconds', () => {
    it('D1 — a stored limit converts to seconds', () => {
        expect(challengeDurationSeconds(15)).toBe(15 * 60);
        expect(challengeDurationSeconds(30)).toBe(30 * 60);
    });

    it('D1 — a falsy limit falls back to 15 minutes', () => {
        expect(challengeDurationSeconds(null)).toBe(15 * 60);
        expect(challengeDurationSeconds(undefined)).toBe(15 * 60);
        expect(challengeDurationSeconds(0)).toBe(15 * 60);
    });
});

describe('mapExamQuestions (reused) — challenge payload', () => {
    it('D2 — the payload maps into id/text option rows', () => {
        const mapped = mapExamQuestions(QUESTIONS);

        expect(mapped[0].options).toEqual([
            { id: 601, text: 'A' },
            { id: 602, text: 'B' },
        ]);
    });

    it('D2 — the challenge answer key never ships', () => {
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

describe('answeredCountIn (reused)', () => {
    it('D3 — selections count, gaps do not', () => {
        expect(answeredCountIn({ 0: 601, 1: undefined, 2: null })).toBe(1);
        expect(answeredCountIn({})).toBe(0);
    });
});

describe('examSubmitAnswers (reused) — challenge submission', () => {
    it('D4 — answered rows ride with their answer ids', () => {
        const answers = examSubmitAnswers(
            QUESTIONS.map((q) => ({ id: q.id })),
            {
                0: 601,
                1: 603,
            },
        );

        expect(answers).toEqual({ 501: 601, 502: 603 });
    });

    it('D4 — skipped rows are omitted entirely, never nulled', () => {
        const answers = examSubmitAnswers(
            QUESTIONS.map((q) => ({ id: q.id })),
            { 0: 602 },
        );

        expect(answers[501]).toBe(602);
        expect(502 in answers).toBe(false);
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

describe('tickTimeLeft / formatClock / examProgressPercent (reused)', () => {
    it('D5 — one second hits zero, the auto-submit signal', () => {
        expect(tickTimeLeft(45)).toBe(44);
        expect(tickTimeLeft(1)).toBe(0);
        expect(tickTimeLeft(0)).toBe(0);
    });

    it('D6 — the clock renders both arms and zero-padding', () => {
        expect(formatClock(3930)).toBe('1h 05m 30s');
        expect(formatClock(2730)).toBe('45:30');
        expect(formatClock(59)).toBe('00:59');
        expect(formatClock(0)).toBe('00:00');
    });

    it('D7 — the progress share resolves, empty included', () => {
        expect(examProgressPercent(2, 4)).toBe(50);
        expect(examProgressPercent(0, 0)).toBe(0);
    });
});

describe('navigatorCellState (reused)', () => {
    it('D8 — the three cell states resolve in precedence', () => {
        expect(navigatorCellState({ isCurrent: true, isAnswered: true })).toBe(
            'current',
        );
        expect(navigatorCellState({ isCurrent: false, isAnswered: true })).toBe(
            'answered',
        );
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
