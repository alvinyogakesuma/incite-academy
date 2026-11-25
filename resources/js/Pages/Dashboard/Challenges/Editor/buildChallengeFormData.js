/**
 * Flatten the challenge form values into a multipart FormData —
 * PHP bracket notation for the nested question/answer rows, files
 * as-is, and booleans as '1'/'0' so they always pass the server's
 * boolean rule.
 *
 * @param {Object} values zod-parsed form values.
 * @returns {FormData}
 */
export default function buildChallengeFormData(values) {
    const data = new FormData();

    data.append('_method', 'put');
    data.append('title', values.title);
    data.append('description', values.description);
    data.append('category', values.category);
    data.append('difficulty', values.difficulty);
    data.append('points', String(values.points));
    data.append('duration', String(values.duration));

    if (values.image instanceof File) {
        data.append('image', values.image);
    }

    data.append('remove_image', values.remove_image ? '1' : '0');

    (values.questions ?? []).forEach((question, questionIndex) => {
        appendQuestion(data, questionIndex, question);
    });

    return data;
}

/**
 * The challenge form's initial values — the stored challenge
 * hydrated with null-safe fallbacks, or the blank defaults when
 * the editor opens for a fresh challenge. The category and
 * difficulty fall back to the page's first option / 'Easy', and
 * the question tree hydrates with stored_id and is_correct
 * mappings.
 *
 * @param {Object|null} challenge
 * @param {string[]} categories
 * @param {string[]} difficulties
 */
export function initialChallengeValues(challenge, categories, difficulties) {
    return {
        title: challenge?.title ?? '',
        description: challenge?.description ?? '',
        category: challenge?.category ?? categories[0] ?? '',
        difficulty: challenge?.difficulty ?? difficulties[0] ?? 'Easy',
        points: challenge?.points ?? 0,
        duration: challenge?.duration ?? 0,
        image: null,
        remove_image: false,
        questions: (challenge?.questions ?? []).map((question) => ({
            stored_id: question.id,
            type: question.type ?? 'text',
            question_content: question.question_content ?? '',
            // New uploads only — the stored file is tracked
            // by audio_url.
            audio: null,
            audio_url: question.audio_url ?? null,
            remove_audio: false,
            answers: (question.answers ?? []).map((answer) => ({
                stored_id: answer.id,
                answer_content: answer.answer_content ?? '',
                is_correct: Boolean(answer.is_correct),
            })),
        })),
    };
}

function appendQuestion(data, questionIndex, question) {
    const prefix = `questions[${questionIndex}]`;

    if (question.stored_id != null) {
        data.append(`${prefix}[id]`, String(question.stored_id));
    }

    data.append(`${prefix}[type]`, question.type);
    data.append(`${prefix}[question_content]`, question.question_content);

    if (question.type === 'listening') {
        if (question.audio instanceof File) {
            data.append(`${prefix}[audio]`, question.audio);
        }

        data.append(
            `${prefix}[remove_audio]`,
            question.remove_audio ? '1' : '0',
        );
    }

    (question.answers ?? []).forEach((answer, answerIndex) => {
        const answerPrefix = `${prefix}[answers][${answerIndex}]`;

        if (answer.stored_id != null) {
            data.append(`${answerPrefix}[id]`, String(answer.stored_id));
        }

        data.append(`${answerPrefix}[answer_content]`, answer.answer_content);
        data.append(
            `${answerPrefix}[is_correct]`,
            answer.is_correct ? '1' : '0',
        );
    });
}
