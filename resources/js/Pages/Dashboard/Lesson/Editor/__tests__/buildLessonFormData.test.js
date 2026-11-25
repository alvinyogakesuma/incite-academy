/**
 * buildLessonFormData tests.
 *
 * The builder is the wire-format contract: PHP bracket notation
 * for the nested rows, booleans as '1'/'0', files as-is, and only
 * the branch matching the lesson's type rides along.
 *
 *  D1  every payload rides the method-spoofed PUT
 *  D2  article payloads carry the body, never the question tree
 *  D3  exam payloads carry the manual time limit; quiz ones don't
 *  D4  quiz payloads nest questions and answers in bracket notation
 *  D5  stored rows keep their ids, fresh rows omit them
 *  D6  booleans ride as '1'/'0'
 *  D7  listening rows carry the audio file and its measured duration
 *  D8  a kept listening row without changes rides no audio file
 *  D9  tolerant inputs — missing rows and keys contribute nothing
 *
 *  initialLessonValues
 *   D10 no lesson → the blank article shape
 *   D11 only an exam hydrates its stored time limit; other types
 *       derive duration from content, so theirs never rides in
 *   D12 the stored question tree hydrates with null-safe fallbacks
 *       and answer ids → stored_id
 *   D13 bare rows hydrate every fallback arm
 */
import { describe, it, expect } from 'vitest';
import buildLessonFormData, {
    initialLessonValues,
} from '../buildLessonFormData';

const makeAnswer = (overrides = {}) => ({
    stored_id: null,
    answer_content: 'Wrong',
    is_true: false,
    ...overrides,
});

const makeQuizValues = () => ({
    title: 'Skimming Basics',
    type: 'quiz',
    duration: null,
    questions: [
        {
            stored_id: 12,
            type: 'text',
            question_content: '<p>Stored text question</p>',
            audio: null,
            audio_url: null,
            audio_duration: null,
            remove_audio: false,
            answers: [
                makeAnswer({ stored_id: 34, answer_content: 'Wrong' }),
                makeAnswer({ answer_content: 'Right', is_true: true }),
            ],
        },
        {
            stored_id: null,
            type: 'listening',
            question_content: '<p>Fresh listening question</p>',
            audio: new File(['clip'], 'clip.mp3', { type: 'audio/mpeg' }),
            audio_url: null,
            audio_duration: 30,
            remove_audio: false,
            answers: [
                makeAnswer({ answer_content: 'Nope' }),
                makeAnswer({ answer_content: 'Yes', is_true: true }),
            ],
        },
    ],
});

const keysStartingWithQuestions = (data) =>
    Array.from(data.keys()).some((key) => key.startsWith('questions['));

describe('buildLessonFormData', () => {
    it('D1 — every payload rides the method-spoofed PUT', () => {
        const data = buildLessonFormData(makeQuizValues());

        expect(data.get('_method')).toBe('put');
        expect(data.get('title')).toBe('Skimming Basics');
        expect(data.get('type')).toBe('quiz');
    });

    it('D2 — article payloads carry the body, never the question tree', () => {
        const data = buildLessonFormData({
            title: 'Skimming Basics',
            type: 'article',
            duration: null,
            article_content: '<p>The article body</p>',
            // A leftover tree from a quiz switch never rides along.
            questions: makeQuizValues().questions,
        });

        expect(data.get('article_content')).toBe('<p>The article body</p>');
        expect(keysStartingWithQuestions(data)).toBe(false);
    });

    it("D3 — exam payloads carry the manual time limit; quiz ones don't", () => {
        const exam = buildLessonFormData({
            ...makeQuizValues(),
            type: 'exam',
            duration: 30,
        });

        expect(exam.get('duration')).toBe('30');
        expect(buildLessonFormData(makeQuizValues()).get('duration')).toBe(
            null,
        );
    });

    it('D4 — quiz payloads nest questions and answers in bracket notation', () => {
        const data = buildLessonFormData(makeQuizValues());

        expect(data.get('questions[0][type]')).toBe('text');
        expect(data.get('questions[0][question_content]')).toBe(
            '<p>Stored text question</p>',
        );
        expect(data.get('questions[0][answers][1][answer_content]')).toBe(
            'Right',
        );
        expect(data.get('questions[1][type]')).toBe('listening');
        expect(data.get('questions[1][question_content]')).toBe(
            '<p>Fresh listening question</p>',
        );
        expect(data.get('questions[1][answers][0][answer_content]')).toBe(
            'Nope',
        );
    });

    it('D5 — stored rows keep their ids, fresh rows omit them', () => {
        const data = buildLessonFormData(makeQuizValues());

        expect(data.get('questions[0][id]')).toBe('12');
        expect(data.get('questions[1][id]')).toBe(null);
        expect(data.get('questions[0][answers][0][id]')).toBe('34');
        expect(data.get('questions[0][answers][1][id]')).toBe(null);
    });

    it('D6 — booleans ride as 1/0 strings', () => {
        const data = buildLessonFormData(makeQuizValues());

        expect(data.get('questions[0][answers][0][is_true]')).toBe('0');
        expect(data.get('questions[0][answers][1][is_true]')).toBe('1');
        expect(data.get('questions[1][remove_audio]')).toBe('0');
    });

    it('D7 — listening rows carry the audio file and its measured duration', () => {
        const data = buildLessonFormData(makeQuizValues());

        const audio = data.get('questions[1][audio]');

        expect(audio).toBeInstanceOf(File);
        expect(audio.name).toBe('clip.mp3');
        expect(data.get('questions[1][audio_duration]')).toBe('30');

        // A pending removal riding with its replacement — the
        // fresh file wins, and the flag still rides as '1'.
        const replaced = buildLessonFormData({
            ...makeQuizValues(),
            questions: [
                {
                    stored_id: 7,
                    type: 'listening',
                    question_content: 'Replaced audio',
                    audio: new File(['new'], 'new.mp3', {
                        type: 'audio/mpeg',
                    }),
                    audio_url: '/storage/questions/stored.mp3',
                    audio_duration: 12,
                    remove_audio: true,
                    answers: [
                        makeAnswer(),
                        makeAnswer({
                            answer_content: 'Right',
                            is_true: true,
                        }),
                    ],
                },
            ],
        });

        expect(replaced.get('questions[0][remove_audio]')).toBe('1');
        expect(replaced.get('questions[0][audio]')).toBeInstanceOf(File);
        expect(replaced.get('questions[0][audio_duration]')).toBe('12');
    });

    it('D8 — a kept listening row without changes rides no audio file', () => {
        const data = buildLessonFormData({
            ...makeQuizValues(),
            questions: [
                {
                    stored_id: 7,
                    type: 'listening',
                    question_content: 'Kept listening question',
                    audio: null,
                    audio_url: '/storage/questions/stored.mp3',
                    audio_duration: null,
                    remove_audio: false,
                    answers: [
                        makeAnswer(),
                        makeAnswer({
                            answer_content: 'Right',
                            is_true: true,
                        }),
                    ],
                },
            ],
        });

        expect(data.get('questions[0][audio]')).toBe(null);
        expect(data.get('questions[0][audio_duration]')).toBe(null);
        expect(data.get('questions[0][remove_audio]')).toBe('0');
    });

    it('D9 — tolerant inputs: missing rows and keys contribute nothing', () => {
        // A question without answers emits no answer keys.
        const quiz = buildLessonFormData({
            title: 'Skimming Basics',
            type: 'quiz',
            duration: null,
            questions: [
                {
                    stored_id: 5,
                    type: 'text',
                    question_content: 'No answers yet',
                },
            ],
        });

        expect(
            Array.from(quiz.keys()).some((key) => key.includes('[answers]')),
        ).toBe(false);

        // A quiz without questions emits no question keys.
        const noQuestions = buildLessonFormData({
            title: 'Skimming Basics',
            type: 'quiz',
            duration: null,
        });

        expect(keysStartingWithQuestions(noQuestions)).toBe(false);

        // An article without a body sends the empty string.
        const noArticleBody = buildLessonFormData({
            title: 'Skimming Basics',
            type: 'article',
            duration: null,
        });

        expect(noArticleBody.get('article_content')).toBe('');
    });
});

describe('initialLessonValues', () => {
    it('D10: no lesson hydrates the blank article shape', () => {
        expect(initialLessonValues(null)).toEqual({
            title: '',
            type: 'article',
            duration: null,
            article_content: '',
            questions: [],
        });
    });

    it('D11: only an exam hydrates its stored time limit', () => {
        expect(
            initialLessonValues({ type: 'exam', duration: 45 }).duration,
        ).toBe(45);

        // A quiz's stored duration is derived from content on save,
        // so it never rides in the form.
        expect(
            initialLessonValues({ type: 'quiz', duration: 45 }).duration,
        ).toBeNull();
    });

    it('D12: the stored question tree hydrates with null-safe fallbacks', () => {
        const values = initialLessonValues({
            title: 'Skimming Basics',
            type: 'quiz',
            questions: [
                {
                    id: 7,
                    type: 'listening',
                    question_content: 'What is the main idea?',
                    audio_url: '/storage/questions/stored.mp3',
                    audio_duration: 30,
                    answers: [
                        { id: 70, answer_content: 'A', is_true: 1 },
                        { id: 71 },
                    ],
                },
            ],
        });

        expect(values.questions[0]).toEqual({
            stored_id: 7,
            type: 'listening',
            question_content: 'What is the main idea?',
            audio: null,
            audio_url: '/storage/questions/stored.mp3',
            audio_duration: 30,
            remove_audio: false,
            answers: [
                { stored_id: 70, answer_content: 'A', is_true: true },
                { stored_id: 71, answer_content: '', is_true: false },
            ],
        });
    });

    it('D13: bare rows hydrate every null-safe fallback', () => {
        const values = initialLessonValues({
            title: 'Bare Lesson',
            type: 'exam',
            article_content: 'Stored body',
            questions: [{ id: 9 }],
        });

        // An exam without a stored limit hydrates null.
        expect(values.duration).toBeNull();
        expect(values.article_content).toBe('Stored body');

        // A question with only its id falls back field by field.
        expect(values.questions[0]).toEqual({
            stored_id: 9,
            type: 'text',
            question_content: '',
            audio: null,
            audio_url: null,
            audio_duration: null,
            remove_audio: false,
            answers: [],
        });
    });
});
