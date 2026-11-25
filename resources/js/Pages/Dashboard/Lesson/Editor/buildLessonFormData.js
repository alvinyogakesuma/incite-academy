/**
 * Flatten the lesson form values into a multipart FormData —
 * PHP bracket notation for the nested question/answer rows, files
 * as-is, and booleans as '1'/'0' so they always pass the server's
 * boolean rule. Only the branch matching the lesson's type rides
 * along: an article sends its body, a quiz or exam sends its
 * question tree.
 *
 * @param {Object} values zod-parsed form values.
 * @returns {FormData}
 */
export default function buildLessonFormData(values) {
    const data = new FormData();

    data.append('_method', 'put');
    data.append('title', values.title);
    data.append('type', values.type);

    if (values.type === 'exam') {
        data.append('duration', String(values.duration));
    }

    if (values.type === 'article') {
        data.append('article_content', values.article_content ?? '');

        return data;
    }

    (values.questions ?? []).forEach((question, questionIndex) => {
        appendQuestion(data, questionIndex, question);
    });

    return data;
}

/**
 * The lesson form's initial values — the stored lesson hydrated
 * with null-safe fallbacks, or the blank article shape when the
 * editor opens without one. Only an exam hydrates its time
 * limit; the other types derive duration from content, so their
 * stored duration never rides in the form.
 *
 * @param {Object|null} lesson
 */
export function initialLessonValues(lesson) {
    return {
        title: lesson?.title ?? '',
        type: lesson?.type ?? 'article',
        duration: lesson?.type === 'exam' ? (lesson?.duration ?? null) : null,
        article_content: lesson?.article_content ?? '',
        questions: (lesson?.questions ?? []).map((question) => ({
            stored_id: question.id,
            type: question.type ?? 'text',
            question_content: question.question_content ?? '',
            // New uploads only — the stored file is tracked
            // by audio_url.
            audio: null,
            audio_url: question.audio_url ?? null,
            audio_duration: question.audio_duration ?? null,
            remove_audio: false,
            answers: (question.answers ?? []).map((answer) => ({
                stored_id: answer.id,
                answer_content: answer.answer_content ?? '',
                is_true: Boolean(answer.is_true),
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

        if (question.audio_duration != null) {
            data.append(
                `${prefix}[audio_duration]`,
                String(question.audio_duration),
            );
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
        data.append(`${answerPrefix}[is_true]`, answer.is_true ? '1' : '0');
    });
}
