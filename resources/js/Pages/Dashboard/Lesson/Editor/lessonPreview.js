/**
 * Lesson editor — the duration/points preview.
 *
 * The preview mirrors the backend's derivations exactly
 * (LessonController::deriveDuration/derivePoints):
 *
 *  - Article: 1 minute per 150 words and 1 point per 10 words,
 *    both floored at 1.
 *  - Exam: the admin-entered time limit passes through; points
 *    come from the question count.
 *  - Quiz: reading time per question text plus the listening
 *    audio, 150 words per minute and audio seconds / 60, floored
 *    at 1 minute; points from the question count.
 *
 *  DD-01 (fixed during extraction): quiz/exam points previously
 *  previewed null ("—") for an empty question list while the
 *  backend saves count(questions) * 10 = 0 — the preview now
 *  mirrors the backend on that arm too.
 *
 *  - previewStatsFor     the 3-arm derivation above.
 *  - durationLabelFor    '—' for a not-yet-entered exam limit,
 *                        'minute'/'minutes' otherwise.
 *  - timeLimitFromInput  the exam time-limit coercion: empty input
 *                        stores null (not ''), non-numeric input
 *                        floors to 1, valid values floor at 1.
 */
import countWords from '@/utils/countWords';

export const WORDS_PER_MINUTE = 150;

export const WORDS_PER_POINT = 10;

export const POINTS_PER_QUESTION = 10;

/**
 * The preview stats for the lesson being edited. `duration` is
 * null only for an exam whose time limit has not been entered yet.
 */
export const previewStatsFor = ({
    type,
    articleContent,
    questions,
    duration,
}) => {
    if (type === 'article') {
        const words = countWords(articleContent);

        return {
            duration: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
            points: Math.max(1, Math.ceil(words / WORDS_PER_POINT)),
        };
    }

    if (type === 'exam') {
        return {
            duration,
            points: questions.length * POINTS_PER_QUESTION,
        };
    }

    const minutes = questions.reduce((total, question) => {
        const words = countWords(question.question_content);
        total += words / WORDS_PER_MINUTE;
        total += (question.audio_duration ?? 0) / 60;
        return total;
    }, 0);

    return {
        duration: Math.max(1, Math.ceil(minutes)),
        points: questions.length * POINTS_PER_QUESTION,
    };
};

/**
 * The duration preview's label — '—' while the exam limit is
 * unfilled, singular at exactly one minute.
 */
export const durationLabelFor = (duration) =>
    duration == null
        ? '—'
        : `${duration} ${duration === 1 ? 'minute' : 'minutes'}`;

/**
 * The exam time-limit input's stored value — null (not '') keeps
 * the wire format type-correct, and any value floors at 1.
 */
export const timeLimitFromInput = (raw) =>
    raw === '' ? null : Math.max(1, parseInt(raw, 10) || 1);
