/**
 * Quiz room tests.
 *
 * Covers every decision in quizRoom.js:
 *
 *  pointsPerQuestion
 *   D1  the lesson points split per question; an empty quiz
 *       resolves to zero (the div-by-zero guard mirrors the
 *       backend's submit scoring)
 *
 *  progressPercentFor
 *   D2  the progress bar's value for the current row; an empty
 *       quiz resolves to zero
 *
 *  optionLetter / mapQuizQuestions
 *   D3  the A/B/C/D letters
 *   D4  the questions payload mapped into option rows — letters,
 *       ids, texts, correctness flags; null-safe over missing
 *       payloads and answer arrays
 *
 *  resultHeadline
 *   D5  100 → 'Perfect Score!'; anything else → 'Great Effort!'
 *
 *  checkAnswerLabel
 *   D6  the three wizard states — check, next, finish
 *
 *  submitPayload
 *   D7  every question id carries its selected answer id; the
 *       backend requires each entry as an integer (the checked-
 *       gate makes unanswered rows unreachable — documented)
 *
 *  exitActionFor
 *   D8  an ordinary row goes back; the first row raises the exit
 *       confirm
 */
import { describe, it, expect } from 'vitest';
import {
    checkAnswerLabel,
    exitActionFor,
    mapQuizQuestions,
    pointsPerQuestion,
    progressPercentFor,
    optionLetter,
    resultHeadline,
    submitPayload,
} from '../quizRoom';

/** Mirrors the takeLesson payload shape (quiz ships correctness). */
const QUESTIONS = [
    {
        id: 101,
        type: 'text',
        question_content: 'Main idea?',
        answers: [
            { id: 201, answer_content: 'Right', is_correct: true },
            { id: 202, answer_content: 'Wrong', is_correct: false },
        ],
    },
    {
        id: 102,
        type: 'listening',
        question_content: 'What did you hear?',
        answers: [
            { id: 203, answer_content: 'Yes', is_correct: false },
            { id: 204, answer_content: 'No', is_correct: true },
        ],
    },
];

describe('pointsPerQuestion', () => {
    it('D1 — the lesson points split evenly across the questions', () => {
        expect(pointsPerQuestion(100, 4)).toBe(25);
    });

    it('D1 — an empty quiz resolves to zero instead of dividing', () => {
        expect(pointsPerQuestion(100, 0)).toBe(0);
    });
});

describe('progressPercentFor', () => {
    it('D2 — the current row sits at its quarter of the bar', () => {
        expect(progressPercentFor(0, 4)).toBe(25);
        expect(progressPercentFor(3, 4)).toBe(100);
    });

    it('D2 — an empty quiz resolves to zero', () => {
        expect(progressPercentFor(0, 0)).toBe(0);
    });
});

describe('optionLetter', () => {
    it('D3 — the rows are lettered A through D', () => {
        expect(optionLetter(0)).toBe('A');
        expect(optionLetter(1)).toBe('B');
        expect(optionLetter(3)).toBe('D');
    });
});

describe('mapQuizQuestions', () => {
    it('D4 — the payload maps into lettered option rows', () => {
        expect(mapQuizQuestions(QUESTIONS)[0]).toEqual({
            id: 101,
            type: 'text',
            question_content: 'Main idea?',
            // The payload rides along under options — the wizard
            // only reads the lettered rows.
            answers: QUESTIONS[0].answers,
            options: [
                {
                    key: 'A',
                    id: 201,
                    text: 'Right',
                    isCorrect: true,
                },
                {
                    key: 'B',
                    id: 202,
                    text: 'Wrong',
                    isCorrect: false,
                },
            ],
        });

        expect(mapQuizQuestions(QUESTIONS)[1].options[0].key).toBe('A');
    });

    it('D4 — a missing payload and bare answers are null-safe', () => {
        expect(mapQuizQuestions(null)).toEqual([]);
        expect(mapQuizQuestions([{ id: 9 }])).toEqual([{ id: 9, options: [] }]);
    });
});

describe('resultHeadline', () => {
    it('D5 — a perfect score celebrates', () => {
        expect(resultHeadline(100)).toBe('Perfect Score!');
    });

    it('D5 — anything else credits the effort', () => {
        expect(resultHeadline(0)).toBe('Great Effort!');
        expect(resultHeadline(99)).toBe('Great Effort!');
    });
});

describe('checkAnswerLabel', () => {
    it("D6 — an unchecked row reads 'Check Answer'", () => {
        expect(
            checkAnswerLabel({ isAnswerChecked: false, hasNext: true }),
        ).toBe('Check Answer');
    });

    it('D6 — a checked row advances to the next question', () => {
        expect(checkAnswerLabel({ isAnswerChecked: true, hasNext: true })).toBe(
            'Next Question',
        );
    });

    it('D6 — the last checked row finishes the exercise', () => {
        expect(
            checkAnswerLabel({ isAnswerChecked: true, hasNext: false }),
        ).toBe('Finish Exercise');
    });
});

describe('submitPayload', () => {
    it('D7 — every question id carries its selected answer id', () => {
        const payload = submitPayload(mapQuizQuestions(QUESTIONS), {
            0: { id: 202 },
            1: { id: 203 },
        });

        expect(payload.answers).toEqual({
            101: 202,
            102: 203,
        });
    });

    it('D7 — a row left without a selection maps to undefined', () => {
        // DD note: the backend validates every answer as required-
        // and-integer, so a null or missing entry would 422 —
        // unreachable, because the wizard's checked-gate prevents
        // advancing past an unchecked row.
        const payload = submitPayload(mapQuizQuestions(QUESTIONS), {
            0: { id: 201 },
        });

        expect(payload.answers[101]).toBe(201);
        expect(payload.answers[102]).toBeUndefined();
    });
});

describe('exitActionFor', () => {
    it('D8 — an ordinary row goes back one', () => {
        expect(exitActionFor(2)).toEqual({ type: 'previous' });
    });

    it('D8 — the first row raises the exit confirm', () => {
        expect(exitActionFor(0)).toEqual({ type: 'exit' });
    });
});
