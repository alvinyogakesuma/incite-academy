/**
 * Quiz room — the boarding and take screens' pure decisions. The
 * exam room (RoomExamStart) shares the identical wizard shape, so
 * it inherits this coverage:
 *
 *  - pointsPerQuestion  the per-question share of the lesson's
 *                       points — zero when the quiz is empty so
 *                       the score line never divides by zero.
 *                       Mirrors the backend's submit scoring
 *                       ($lesson->points / count($questions)).
 *  - progressPercentFor the progress bar's value for the current
 *                       row.
 *  - optionLetter       the option rows' A/B/C/D keys.
 *  - mapQuizQuestions   the questions payload mapped into option
 *                       rows (letters, ids, texts, and the
 *                       instant-feedback correctness flags).
 *  - resultHeadline     the completion card's headline — a
 *                       perfect score celebrates, anything else
 *                       still credits the effort.
 *  - checkAnswerLabel   the wizard button's three states — check
 *                       the current row, advance to the next, or
 *                       finish the attempt.
 *  - submitPayload      the finished attempt's payload — every
 *                       question id with its selected answer id.
 *                       DD note: the backend validates every
 *                       answer as required-and-integer, so a null
 *                       would 422 — unreachable, because the
 *                       wizard's checked-gate prevents advancing
 *                       past an unchecked row.
 *  - exitActionFor      the Previous button's action on the first
 *                       row — go back a row, or raise the exit
 *                       confirm.
 */

/**
 * The per-question share of the lesson's points — zero for an
 * empty quiz so nothing downstream divides by zero.
 */
export const pointsPerQuestion = (lessonPoints, totalQuestions) =>
    totalQuestions > 0 ? lessonPoints / totalQuestions : 0;

/**
 * The progress bar's value for the current row.
 */
export const progressPercentFor = (currentIdx, totalQuestions) =>
    totalQuestions > 0 ? ((currentIdx + 1) / totalQuestions) * 100 : 0;

/**
 * The option rows' A/B/C/D letters.
 */
export const optionLetter = (index) => String.fromCharCode(65 + index);

/**
 * Map the questions payload into option rows — letters, ids,
 * texts, and the instant-feedback correctness flags.
 */
export const mapQuizQuestions = (questions) =>
    (questions || []).map((question) => ({
        ...question,
        options: (question.answers || []).map((answer, i) => ({
            key: optionLetter(i),
            id: answer.id,
            text: answer.answer_content,
            isCorrect: answer.is_correct,
        })),
    }));

/**
 * The completion card's headline — a perfect score celebrates.
 */
export const resultHeadline = (percentage) =>
    percentage === 100 ? 'Perfect Score!' : 'Great Effort!';

/**
 * The wizard button's label — check the current row, advance to
 * the next, or finish the attempt.
 */
export const checkAnswerLabel = ({ isAnswerChecked, hasNext }) => {
    if (!isAnswerChecked) {
        return 'Check Answer';
    }

    return hasNext ? 'Next Question' : 'Finish Exercise';
};

/**
 * The finished attempt's payload — every question id with its
 * selected answer id.
 */
export const submitPayload = (mappedQuestions, userAnswers) => ({
    answers: Object.fromEntries(
        mappedQuestions.map((question, index) => [
            question.id,
            userAnswers[index]?.id,
        ]),
    ),
});

/**
 * The Previous button's action — an ordinary row goes back one,
 * the first row raises the exit confirm instead.
 */
export const exitActionFor = (currentIdx) =>
    currentIdx > 0 ? { type: 'previous' } : { type: 'exit' };
