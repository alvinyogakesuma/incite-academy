/**
 * Lesson preview tests.
 *
 * The preview mirrors the backend's derivations (LessonController::
 * deriveDuration / derivePoints) — the cases below assert against
 * those formulas so the "mirror" contract is test-enforced:
 *
 *  previewStatsFor
 *   D1  article duration: 1 minute per 150 words, floored at 1
 *   D2  article points: 1 point per 10 words, floored at 1
 *   D3  exam duration: the admin-entered limit passes through
 *       (null stays null until the schema blocks the save)
 *   D4  quiz duration: per-question reading time (words / 150)
 *       plus listening audio (seconds / 60); null audio
 *       contributes nothing; floored at 1
 *   D5  quiz/exam points: questions × 10 — the empty list mirrors
 *       the backend's 0 (DD-01: previously previewed null)
 *
 *  durationLabelFor
 *   D6  null → '—' (the exam limit is unfilled)
 *   D7  exactly one → '1 minute'; otherwise 'minutes'
 *
 *  timeLimitFromInput
 *   D8  '' → null (the wire format stays type-correct)
 *   D9  non-numeric input floors to 1
 *   D10 values floor at 1; valid values pass through
 */
import { describe, it, expect } from 'vitest';
import {
    previewStatsFor,
    durationLabelFor,
    timeLimitFromInput,
} from '../lessonPreview';

const words = (count) => 'word '.repeat(count).trim();

const article = (articleContent) => ({
    type: 'article',
    articleContent,
    questions: [],
    duration: null,
});

describe('previewStatsFor — article (mirror: words / 150, words / 10)', () => {
    it('D1 — an empty article floors its duration at 1 minute', () => {
        expect(previewStatsFor(article(''))).toEqual({
            duration: 1,
            points: 1,
        });
    });

    it('D1 — exactly 150 words is 1 minute; 151 words is 2', () => {
        expect(previewStatsFor(article(words(150))).duration).toBe(1);
        expect(previewStatsFor(article(words(151))).duration).toBe(2);
    });

    it('D2 — 10 words is 1 point; 11 words is 2 points', () => {
        expect(previewStatsFor(article(words(10))).points).toBe(1);
        expect(previewStatsFor(article(words(11))).points).toBe(2);
    });
});

describe('previewStatsFor — exam (mirror: manual limit, questions x 10)', () => {
    it('D3 — the admin-entered limit passes through, null included', () => {
        const base = {
            type: 'exam',
            articleContent: '',
            questions: [],
        };

        expect(previewStatsFor({ ...base, duration: 45 }).duration).toBe(45);
        expect(
            previewStatsFor({ ...base, duration: null }).duration,
        ).toBeNull();
    });

    it('D5 — an empty exam mirrors the backend and saves 0 points (DD-01)', () => {
        // derivePoints: count(questions) * 10 = 0 — the preview
        // previously showed null here, diverging from the save.
        expect(
            previewStatsFor({
                type: 'exam',
                articleContent: '',
                questions: [],
                duration: 30,
            }).points,
        ).toBe(0);
    });

    it('D5 — three exam questions preview 30 points', () => {
        expect(
            previewStatsFor({
                type: 'exam',
                articleContent: '',
                questions: [{}, {}, {}],
                duration: 30,
            }).points,
        ).toBe(30);
    });
});

describe('previewStatsFor — quiz (mirror: reading time + audio, x 10)', () => {
    it('D4 — question text and audio both count toward the minutes', () => {
        // 150 words of reading time + 60 seconds of audio = 2 minutes.
        const stats = previewStatsFor({
            type: 'quiz',
            articleContent: '',
            duration: null,
            questions: [
                {
                    question_content: words(150),
                    audio_duration: 60,
                },
                {
                    question_content: '',
                    audio_duration: null,
                },
            ],
        });

        expect(stats.duration).toBe(2);
        expect(stats.points).toBe(20);
    });

    it('D4 — null audio durations contribute nothing', () => {
        expect(
            previewStatsFor({
                type: 'quiz',
                articleContent: '',
                duration: null,
                questions: [{ question_content: '', audio_duration: null }],
            }).duration,
        ).toBe(1);
    });

    it('D5 — an empty quiz mirrors the backend and saves 0 points (DD-01)', () => {
        expect(
            previewStatsFor({
                type: 'quiz',
                articleContent: '',
                duration: null,
                questions: [],
            }),
        ).toEqual({ duration: 1, points: 0 });
    });
});

describe('durationLabelFor', () => {
    it('D6 — an unfilled exam limit renders as a dash', () => {
        expect(durationLabelFor(null)).toBe('—');
    });

    it('D7 — exactly one minute is singular, the rest plural', () => {
        expect(durationLabelFor(1)).toBe('1 minute');
        expect(durationLabelFor(2)).toBe('2 minutes');
        expect(durationLabelFor(45)).toBe('45 minutes');
    });
});

describe('timeLimitFromInput', () => {
    it("D8 — empty input stores null, not ''", () => {
        expect(timeLimitFromInput('')).toBeNull();
    });

    it('D9 — non-numeric input floors to 1', () => {
        expect(timeLimitFromInput('abc')).toBe(1);
    });

    it('D10 — values floor at 1; valid values pass through', () => {
        expect(timeLimitFromInput('0')).toBe(1);
        expect(timeLimitFromInput('45')).toBe(45);
    });
});
