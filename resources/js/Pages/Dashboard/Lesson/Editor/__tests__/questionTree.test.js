/**
 * Question-tree tests.
 *
 * Covers every decision in questionTree.js:
 *
 *  audioPreviewFor
 *   D1  fresh upload → the object URL; pending removal → null;
 *       stored kept → the stored URL
 *
 *  audioFilenameFor
 *   D2  fresh → the File's name; stored → the URL's basename;
 *       no URL → null
 *
 *  removalPatchFor
 *   D3  a fresh upload clears the audio field; a stored file flags
 *       remove_audio and drops its duration
 *
 *  correctChoiceRows
 *   D4  exactly the chosen row is marked true; stored_id and
 *       content are preserved with null-safe fallbacks
 *
 *  nextChoiceLabel
 *   D5  the seeded placeholder for the next position
 *
 *  blankQuestionRow
 *   D6  saves as-is: text type, two-choice minimum, the first
 *       answer already marked correct
 *
 *  questionMovePair
 *   D7  no target / self-drop / unknown ids → null; valid drags
 *       resolve to the index pair (forward and backward)
 *
 *  newlyAddedQuestionId
 *   D8  growth → the last row's id; no growth / shrink → null
 *
 *  questionDeleteDescription
 *   D9  the position-keyed copy; null → ''
 */
import { describe, it, expect } from 'vitest';
import {
    audioFilenameFor,
    audioPreviewFor,
    blankQuestionRow,
    correctChoiceRows,
    nextChoiceLabel,
    newlyAddedQuestionId,
    questionDeleteDescription,
    questionMovePair,
    removalPatchFor,
} from '../questionTree';

const freshAudio = () =>
    new File([new ArrayBuffer(8)], 'diction.mp3', { type: 'audio/mpeg' });

const FIELDS = [
    { id: 'q1', stored_id: 11, answer_content: 'A', is_true: false },
    { id: 'q2', stored_id: 22, answer_content: 'B', is_true: true },
    { id: 'q3', stored_id: 33, answer_content: 'C', is_true: false },
];

describe('audioPreviewFor', () => {
    it('D1 — a fresh upload previews through its object URL', () => {
        expect(
            audioPreviewFor(freshAudio(), 'blob:preview', false, '/stored.mp3'),
        ).toBe('blob:preview');
    });

    it('D1 — a pending removal hides the stored file', () => {
        expect(audioPreviewFor(null, null, true, '/stored.mp3')).toBeNull();
    });

    it('D1 — a kept stored file previews its stored URL', () => {
        expect(audioPreviewFor(null, null, false, '/stored.mp3')).toBe(
            '/stored.mp3',
        );
    });
});

describe('audioFilenameFor', () => {
    it('D2 — a fresh upload shows the File name', () => {
        expect(audioFilenameFor(freshAudio(), '/stored.mp3')).toBe(
            'diction.mp3',
        );
    });

    it('D2 — a stored file shows its URL basename', () => {
        expect(audioFilenameFor(null, '/storage/lessons/audio/clip.mp3')).toBe(
            'clip.mp3',
        );
    });

    it('D2 — no audio at all resolves to null', () => {
        expect(audioFilenameFor(null, null)).toBeNull();
    });
});

describe('removalPatchFor', () => {
    it('D3 — removing a fresh upload clears the audio field only', () => {
        expect(removalPatchFor(freshAudio())).toEqual({ audio: null });
    });

    it('D3 — removing a stored file flags remove_audio and drops the duration', () => {
        expect(removalPatchFor(null)).toEqual({
            remove_audio: true,
            audio_duration: null,
        });
    });
});

describe('correctChoiceRows', () => {
    it('D4 — exactly the chosen row is marked true, others false', () => {
        const rows = correctChoiceRows(FIELDS, 2);

        expect(rows.map((row) => row.is_true)).toEqual([false, false, true]);
    });

    it('D4 — stored_id and content are preserved', () => {
        const rows = correctChoiceRows(FIELDS, 1);

        expect(rows[1]).toEqual({
            stored_id: 22,
            answer_content: 'B',
            is_true: true,
        });
    });

    it('D4 — null-safe fallbacks apply to bare rows', () => {
        const rows = correctChoiceRows([{ id: 'q1' }], 0);

        expect(rows[0]).toEqual({
            stored_id: null,
            answer_content: '',
            is_true: true,
        });
    });
});

describe('nextChoiceLabel', () => {
    it('D5 — the next position is seeded with its placeholder', () => {
        expect(nextChoiceLabel(2)).toBe('Choice 3');
    });
});

describe('blankQuestionRow', () => {
    it('D6 — a fresh question saves as-is with its two-choice minimum', () => {
        expect(blankQuestionRow()).toEqual({
            stored_id: null,
            type: 'text',
            question_content: '',
            audio: null,
            audio_url: null,
            audio_duration: null,
            remove_audio: false,
            answers: [
                { stored_id: null, answer_content: 'Choice 1', is_true: true },
                { stored_id: null, answer_content: 'Choice 2', is_true: false },
            ],
        });
    });
});

describe('questionMovePair', () => {
    it('D7 — a drop without a target is a no-op', () => {
        expect(questionMovePair(FIELDS, 'q1', undefined)).toBeNull();
    });

    it('D7 — dropping a row onto itself is a no-op', () => {
        expect(questionMovePair(FIELDS, 'q2', 'q2')).toBeNull();
    });

    it('D7 — unknown ids are no-ops', () => {
        expect(questionMovePair(FIELDS, 'nope', 'q2')).toBeNull();
        expect(questionMovePair(FIELDS, 'q1', 'nope')).toBeNull();
    });

    it('D7 — a forward drag resolves to its index pair', () => {
        expect(questionMovePair(FIELDS, 'q1', 'q3')).toEqual({
            oldIndex: 0,
            newIndex: 2,
        });
    });

    it('D7 — a backward drag resolves to its index pair', () => {
        expect(questionMovePair(FIELDS, 'q3', 'q1')).toEqual({
            oldIndex: 2,
            newIndex: 0,
        });
    });
});

describe('newlyAddedQuestionId', () => {
    it('D8 — growth resolves to the appended row’s id', () => {
        expect(
            newlyAddedQuestionId([...FIELDS, { id: 'q4' }], FIELDS.length),
        ).toBe('q4');
    });

    it('D8 — no growth and shrink resolve to null', () => {
        expect(newlyAddedQuestionId(FIELDS, FIELDS.length)).toBeNull();
        expect(
            newlyAddedQuestionId(FIELDS.slice(0, 2), FIELDS.length),
        ).toBeNull();
    });
});

describe('questionDeleteDescription', () => {
    it('D9 — the copy is keyed to the question’s position', () => {
        expect(questionDeleteDescription(2)).toBe(
            'Are you sure you want to delete Question 3 and its answer choices? The lesson is saved with the question removed.',
        );
    });

    it('D9 — a null index renders no copy', () => {
        expect(questionDeleteDescription(null)).toBe('');
    });
});
