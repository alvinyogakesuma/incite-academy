/**
 * buildChallengeFormData tests.
 *
 * The builder is the wire-format contract: PHP bracket notation
 * for the nested rows, booleans as '1'/'0', files as-is, and the
 * metadata always rides.
 *
 *  D1  every payload rides the method-spoofed PUT
 *  D2  metadata strings always ride (points/duration via String)
 *  D3  the cover image rides only when it is a File
 *  D4  remove_image rides as '1'/'0'
 *  D5  questions nest in bracket notation
 *  D6  stored rows keep their ids, fresh rows omit them
 *  D7  listening rows carry the audio file and remove_audio;
 *      text rows carry no audio keys
 *  D8  answers carry is_correct as '1'/'0' and omit fresh ids
 *  D9  tolerant inputs — missing rows and keys contribute nothing
 *
 *  initialChallengeValues
 *   D10 no challenge → the blank defaults (category/difficulty
 *       fall back to the page's first option / 'Easy')
 *   D11 a stored challenge hydrates every field with null-safe
 *       fallbacks
 *   D12 bare rows hydrate every fallback arm
 *   D13 the defaults chain runs with empty category/difficulty lists
 *   D14 a listening row without a fresh upload rides no audio key
 */
import { describe, it, expect } from 'vitest';
import buildChallengeFormData, {
    initialChallengeValues,
} from '../buildChallengeFormData';

const makeAnswer = (overrides = {}) => ({
    stored_id: null,
    answer_content: 'Wrong',
    is_correct: false,
    ...overrides,
});

const makeQuestion = (overrides = {}) => ({
    stored_id: null,
    type: 'text',
    question_content: 'Main idea?',
    audio: null,
    audio_url: null,
    remove_audio: false,
    answers: [makeAnswer(), makeAnswer({ is_correct: true })],
    ...overrides,
});

const makeValues = (overrides = {}) => ({
    title: 'Reading Sprint',
    description: 'Timed skimming drills',
    category: 'Reading Comprehension',
    difficulty: 'Easy',
    points: 40,
    duration: 15,
    image: null,
    remove_image: false,
    questions: [],
    ...overrides,
});

describe('buildChallengeFormData', () => {
    it('D1 — the payload rides the method-spoofed PUT', () => {
        const data = buildChallengeFormData(makeValues());

        expect(data.get('_method')).toBe('put');
        expect(data.get('title')).toBe('Reading Sprint');
    });

    it('D2 — metadata strings always ride', () => {
        const data = buildChallengeFormData(
            makeValues({ points: 40, duration: 15 }),
        );

        expect(data.get('category')).toBe('Reading Comprehension');
        expect(data.get('difficulty')).toBe('Easy');
        expect(data.get('points')).toBe('40');
        expect(data.get('duration')).toBe('15');
    });

    it('D3 — the cover image rides only when it is a File', () => {
        const withImage = makeValues({
            image: new File([new ArrayBuffer(8)], 'cover.png', {
                type: 'image/png',
            }),
        });

        expect(buildChallengeFormData(withImage).get('image')).toBeInstanceOf(
            File,
        );
        expect(buildChallengeFormData(makeValues()).get('image')).toBeNull();
    });

    it("D4 — remove_image rides as '1'/'0'", () => {
        expect(buildChallengeFormData(makeValues()).get('remove_image')).toBe(
            '0',
        );
        expect(
            buildChallengeFormData(makeValues({ remove_image: true })).get(
                'remove_image',
            ),
        ).toBe('1');
    });

    it('D5 — questions nest in bracket notation', () => {
        const data = buildChallengeFormData(
            makeValues({ questions: [makeQuestion()] }),
        );

        expect(data.get('questions[0][type]')).toBe('text');
        expect(data.get('questions[0][question_content]')).toBe('Main idea?');
    });

    it('D6 — stored rows keep their ids, fresh rows omit them', () => {
        const data = buildChallengeFormData(
            makeValues({
                questions: [
                    makeQuestion({
                        stored_id: 9,
                        answers: [
                            makeAnswer({ stored_id: 90 }),
                            makeAnswer({ is_correct: true }),
                        ],
                    }),
                    makeQuestion({ question_content: 'Fresh row' }),
                ],
            }),
        );

        expect(data.get('questions[0][id]')).toBe('9');
        expect(data.get('questions[0][answers][0][id]')).toBe('90');
        expect(Array.from(data.keys()).includes('questions[1][id]')).toBe(
            false,
        );
    });

    it('D7 — listening rows carry the audio file and remove_audio; text rows carry no audio keys', () => {
        const data = buildChallengeFormData(
            makeValues({
                questions: [
                    makeQuestion({
                        type: 'listening',
                        audio: new File([new ArrayBuffer(8)], 'clip.mp3', {
                            type: 'audio/mpeg',
                        }),
                    }),
                    makeQuestion({ type: 'text' }),
                ],
            }),
        );

        expect(data.get('questions[0][audio]')).toBeInstanceOf(File);
        expect(data.get('questions[0][remove_audio]')).toBe('0');
        expect(
            Array.from(data.keys()).includes('questions[1][remove_audio]'),
        ).toBe(false);
    });

    it("D8 — answers carry is_correct as '1'/'0' and omit fresh ids", () => {
        const data = buildChallengeFormData(
            makeValues({ questions: [makeQuestion()] }),
        );

        expect(data.get('questions[0][answers][0][answer_content]')).toBe(
            'Wrong',
        );
        expect(data.get('questions[0][answers][0][is_correct]')).toBe('0');
        expect(data.get('questions[0][answers][1][is_correct]')).toBe('1');
        expect(
            Array.from(data.keys()).includes('questions[0][answers][0][id]'),
        ).toBe(false);
    });

    it('D9 — tolerant inputs: missing rows and keys contribute nothing', () => {
        const noQuestions = buildChallengeFormData(
            makeValues({ questions: undefined }),
        );

        expect(keysStartingWithQuestions(noQuestions)).toBe(false);

        const bareRow = buildChallengeFormData(
            makeValues({ questions: [{ stored_id: 5, type: 'text' }] }),
        );

        expect(
            Array.from(bareRow.keys()).includes('questions[0][answers]'),
        ).toBe(false);
    });

    function keysStartingWithQuestions(data) {
        return Array.from(data.keys()).some((key) =>
            key.startsWith('questions'),
        );
    }
});

describe('initialChallengeValues', () => {
    it('D10 — no challenge hydrates the blank defaults', () => {
        expect(
            initialChallengeValues(
                null,
                ['Reading Comprehension'],
                ['Easy', 'Medium', 'Hard'],
            ),
        ).toEqual({
            title: '',
            description: '',
            category: 'Reading Comprehension',
            difficulty: 'Easy',
            points: 0,
            duration: 0,
            image: null,
            remove_image: false,
            questions: [],
        });
    });

    it('D11 — a stored challenge hydrates every field with fallbacks', () => {
        const values = initialChallengeValues(
            {
                title: 'Reading Sprint',
                description: 'Timed drills',
                category: 'Listening Comprehension',
                difficulty: 'Hard',
                points: 60,
                duration: 25,
                image_url: '/storage/covers/cover.png',
                questions: [
                    {
                        id: 7,
                        type: 'listening',
                        question_content: 'What did you hear?',
                        audio_url: '/storage/audio/clip.mp3',
                        answers: [
                            { id: 70, answer_content: 'A', is_correct: 1 },
                            { id: 71 },
                        ],
                    },
                ],
            },
            ['Reading Comprehension'],
            ['Easy', 'Medium', 'Hard'],
        );

        expect(values).toEqual({
            title: 'Reading Sprint',
            description: 'Timed drills',
            category: 'Listening Comprehension',
            difficulty: 'Hard',
            points: 60,
            duration: 25,
            image: null,
            remove_image: false,
            questions: [
                {
                    stored_id: 7,
                    type: 'listening',
                    question_content: 'What did you hear?',
                    audio: null,
                    audio_url: '/storage/audio/clip.mp3',
                    remove_audio: false,
                    answers: [
                        {
                            stored_id: 70,
                            answer_content: 'A',
                            is_correct: true,
                        },
                        {
                            stored_id: 71,
                            answer_content: '',
                            is_correct: false,
                        },
                    ],
                },
            ],
        });
    });

    it('D12 — bare rows hydrate every fallback arm, including the defaults chain', () => {
        // No category/difficulty on the challenge: the defaults
        // chain runs (categories[0] ?? '', difficulties[0] ?? 'Easy').
        const values = initialChallengeValues(
            {
                questions: [{ id: 9 }],
            },
            ['Reading Comprehension', 'Listening Comprehension'],
            ['Easy', 'Medium', 'Hard'],
        );

        expect(values.category).toBe('Reading Comprehension');
        expect(values.difficulty).toBe('Easy');

        expect(values.questions[0]).toEqual({
            stored_id: 9,
            type: 'text',
            question_content: '',
            audio: null,
            audio_url: null,
            remove_audio: false,
            answers: [],
        });
    });

    it('D13 — the full fallback chain runs with empty category/difficulty lists', () => {
        const values = initialChallengeValues(null, [], []);

        expect(values.category).toBe('');
        expect(values.difficulty).toBe('Easy');
        expect(values.questions).toEqual([]);
    });

    it('D14 — a listening row without a fresh upload rides no audio key', () => {
        const data = buildChallengeFormData(
            makeValues({
                questions: [
                    makeQuestion({
                        type: 'listening',
                        audio: null,
                        audio_url: '/storage/audio/kept.mp3',
                        remove_audio: true,
                    }),
                ],
            }),
        );

        expect(Array.from(data.keys()).includes('questions[0][audio]')).toBe(
            false,
        );
        expect(data.get('questions[0][remove_audio]')).toBe('1');
    });
});
