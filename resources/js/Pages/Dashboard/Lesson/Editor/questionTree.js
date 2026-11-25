/**
 * Lesson editor — the question/answer tree's decisions.
 *
 * The cards keep the react-hook-form wiring; these helpers own
 * the audio preview, the answer-choice bookkeeping, and the
 * outline's drag/delete/expansion decisions so every outcome is
 * unit testable. The Challenge editor's outline is this tree's
 * twin and reuses the same helpers through their defaults:
 *
 *  - audioPreviewFor         the 3-arm preview switch: a fresh
 *                            upload previews through its object
 *                            URL, a pending removal hides the
 *                            stored file, anything else keeps the
 *                            stored URL.
 *  - audioFilenameFor        fresh uploads show the File's name,
 *                            stored files their URL's basename.
 *  - removalPatchFor         the removal split: removing a fresh
 *                            upload clears the audio field;
 *                            removing a stored file flags
 *                            remove_audio and clears the
 *                            duration (lessons only —
 *                            challenges carry no duration).
 *  - correctChoiceRows       the radio owns every row's flag —
 *                            exactly one correct answer, other
 *                            fields preserved with null-safe
 *                            fallbacks.
 *  - nextChoiceLabel         the seeded placeholder text for the
 *                            choice at the next position.
 *  - blankQuestionRow        the Add Question factory: a fresh
 *                            question saves as-is with its
 *                            two-choice minimum and the first
 *                            answer already marked correct.
 *  - questionMovePair        a question drag's decision triple: a
 *                            no-op drop (no target or itself) and
 *                            unknown ids resolve to null, anything
 *                            else resolves to the move's index
 *                            pair.
 *  - newlyAddedQuestionId    growth detection — the field-array id
 *                            of the question a fresh append just
 *                            added, else null.
 *  - questionDeleteDescription  the confirmation copy keyed to the
 *                            question's position and the editor's
 *                            subject (lesson/challenge).
 */

/**
 * The audio preview's URL — fresh uploads play from the object URL,
 * pending removals hide the stored file before the round-trip.
 */
export const audioPreviewFor = (audio, objectUrl, removeAudio, audioUrl) =>
    audio instanceof File ? objectUrl : removeAudio ? null : audioUrl;

/**
 * The audio preview's filename.
 */
export const audioFilenameFor = (audio, audioUrl) =>
    audio instanceof File ? audio.name : (audioUrl?.split('/').pop() ?? null);

/**
 * The fields a removal clears — a fresh upload never flags
 * remove_audio (nothing is stored for it), a stored file does.
 * The `withAudioDuration` flag marks lessons, which carry an
 * audio duration; challenges don't.
 */
export const removalPatchFor = (audio, { withAudioDuration = true } = {}) =>
    audio instanceof File
        ? { audio: null }
        : {
              remove_audio: true,
              ...(withAudioDuration ? { audio_duration: null } : {}),
          };

/**
 * The rows to write so exactly one answer is correct — every
 * other field rides along with null-safe fallbacks. The
 * `correctKey` names the flag field: `is_true` for lessons,
 * `is_correct` for challenges.
 */
export const correctChoiceRows = (
    answerFields,
    choiceIndex,
    { correctKey = 'is_true' } = {},
) =>
    answerFields.map((field, index) => ({
        stored_id: field.stored_id ?? null,
        answer_content: field.answer_content ?? '',
        [correctKey]: index === choiceIndex,
    }));

/**
 * The seeded label for the choice at the next position — what you
 * see is what saves.
 */
export const nextChoiceLabel = (existingCount) => `Choice ${existingCount + 1}`;

/**
 * The Add Question factory — a blank row that saves as-is: text
 * type, no audio, and the two-choice minimum with the first
 * answer already marked correct. The `withAudioDuration` flag
 * marks lessons, which carry an audio duration; challenges don't.
 */
export const blankQuestionRow = ({ withAudioDuration = true } = {}) => ({
    stored_id: null,
    type: 'text',
    question_content: '',
    audio: null,
    audio_url: null,
    ...(withAudioDuration ? { audio_duration: null } : {}),
    remove_audio: false,
    answers: [
        {
            stored_id: null,
            answer_content: 'Choice 1',
            is_true: true,
        },
        {
            stored_id: null,
            answer_content: 'Choice 2',
            is_true: false,
        },
    ],
});

/**
 * Resolve a question drag into the field-array move's index pair,
 * or null when nothing should move.
 */
export const questionMovePair = (fields, activeId, overId) => {
    if (!overId || activeId === overId) {
        return null;
    }

    const oldIndex = fields.findIndex((field) => field.id === activeId);
    const newIndex = fields.findIndex((field) => field.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
        return null;
    }

    return { oldIndex, newIndex };
};

/**
 * The field-array id of the question a fresh append just added —
 * the field array's row ids are stable, so growth is detected by
 * comparing counts.
 */
export const newlyAddedQuestionId = (fields, prevCount) => {
    if (fields.length > prevCount) {
        return String(fields[fields.length - 1].id);
    }

    return null;
};

/**
 * The delete dialog's copy — keyed to the question's position.
 * The `subject` names the editor whose save lands (lesson /
 * challenge).
 */
export const questionDeleteDescription = (index, subject = 'lesson') =>
    index !== null
        ? `Are you sure you want to delete Question ${index + 1} and its answer choices? The ${subject} is saved with the question removed.`
        : '';
