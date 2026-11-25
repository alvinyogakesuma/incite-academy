/**
 * Exam room — the boarding and timed take screens' pure decisions.
 *
 *  - examDurationSeconds   the countdown's initial value — the
 *                          lesson's time limit in seconds, with a
 *                          60-minute fallback (the lesson schema
 *                          floors stored limits at 1, so the
 *                          falsy-zero arm is unreachable and
 *                          documented).
 *  - mapExamQuestions      the questions payload mapped into
 *                          option rows — ids and texts only.
 *                          Exams never receive the answer key;
 *                          only the server scores.
 *  - answeredCountIn       the navigator's answered counter — a
 *                          selection counts when it is neither
 *                          undefined nor null.
 *  - examSubmitAnswers     the finished attempt's answers — only
 *                          answered rows ride, unanswered rows are
 *                          omitted entirely. The free navigation
 *                          makes skipped rows reachable, and the
 *                          backend's per-key required-integer
 *                          rule tolerates missing keys while
 *                          nulls would 422 — the mirror of the
 *                          quiz's checked-gate contract.
 *  - tickTimeLeft          the countdown's tick — at one second it
 *                          hits zero (the auto-submit signal),
 *                          anything else ticks down.
 *  - formatClock           the timer bar's label — hours render
 *                          "Xh MMm SSs", sub-hour renders "MM:SS".
 *  - examProgressPercent   the progress bar's value — the
 *                          answered share, zero for an empty exam
 *                          so nothing divides by zero.
 *  - navigatorCellState    the navigator grid's cell state — the
 *                          current row wins, then answered rows,
 *                          then the default.
 */

/**
 * The countdown's initial value in seconds.
 */
export const examDurationSeconds = (duration) => (duration || 60) * 60;

/**
 * Map the questions payload into option rows — ids and texts
 * only; the exam ships no correctness flags.
 */
export const mapExamQuestions = (questions) =>
    (questions || []).map((question) => ({
        ...question,
        options: (question.answers || []).map((answer) => ({
            id: answer.id,
            text: answer.answer_content,
        })),
    }));

/**
 * The navigator's answered counter — a selection counts when it
 * is neither undefined nor null.
 */
export const answeredCountIn = (userAnswers) =>
    Object.keys(userAnswers).filter(
        (k) => userAnswers[k] !== undefined && userAnswers[k] !== null,
    ).length;

/**
 * The finished attempt's answers — only answered rows ride;
 * unanswered rows are omitted so the backend's per-key
 * required-integer rule never sees a null.
 */
export const examSubmitAnswers = (mappedQuestions, userAnswers) => {
    const answers = {};

    mappedQuestions.forEach((question, idx) => {
        const answerId = userAnswers[idx];

        if (answerId) {
            answers[question.id] = answerId;
        }
    });

    return answers;
};

/**
 * The countdown's tick — at one second the timer hits zero (the
 * auto-submit signal), anything else ticks down.
 */
export const tickTimeLeft = (prev) => (prev <= 1 ? 0 : prev - 1);

/**
 * The timer bar's label.
 */
export const formatClock = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs
            .toString()
            .padStart(2, '0')}s`;
    }

    return `${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
};

/**
 * The progress bar's value — the answered share, zero for an
 * empty exam.
 */
export const examProgressPercent = (answeredCount, totalQuestions) =>
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

/**
 * The navigator grid's cell state — the current row wins, then
 * answered rows, then the default.
 */
export const navigatorCellState = ({ isCurrent, isAnswered }) => {
    if (isCurrent) {
        return 'current';
    }

    if (isAnswered) {
        return 'answered';
    }

    return 'default';
};
