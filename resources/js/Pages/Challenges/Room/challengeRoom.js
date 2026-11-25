/**
 * Challenge room — the page's own pure decisions. The take screen
 * is the exam take screen's twin, so it reuses the covered exam
 * helpers for everything shared and this module owns only what
 * differs:
 *
 *  - challengeDurationSeconds  the countdown's initial value — the
 *                              challenge's time limit in seconds,
 *                              with a 15-minute fallback (the
 *                              admin's duration validation floors
 *                              stored limits at 1, so the
 *                              falsy-zero arm is unreachable and
 *                              documented).
 *
 * Reused from @/Pages/Courses/RoomExam/examRoom.js (covered by the
 * exam room suite, not double-counted here): mapExamQuestions —
 * the challenge payload ships answers without correctness flags,
 * matching the exam's mapping exactly; answeredCountIn;
 * examSubmitAnswers — the backend validates the same
 * per-key required-integer rule, and the free navigation makes
 * skipped rows reachable, so unanswered rows are omitted;
 * tickTimeLeft; formatClock; examProgressPercent;
 * navigatorCellState. Reused from
 * @/Pages/Courses/RoomQuiz/quizRoom.js: resultHeadline.
 */

/**
 * The countdown's initial value in seconds.
 */
export const challengeDurationSeconds = (duration) => (duration || 15) * 60;
