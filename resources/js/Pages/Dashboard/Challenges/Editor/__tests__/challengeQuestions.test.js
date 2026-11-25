/**
 * Challenge question-tree tests.
 *
 * Pins the challenge arms of the shared questionTree.js helpers
 * (reused from the Lesson editor — covered there for the default
 * lesson arms; this suite exercises the challenge variants):
 *
 *  blankQuestionRow / removalPatchFor
 *   D1  challenge rows carry NO audio_duration field
 *
 *  removalPatchFor
 *   D2  the fresh/stored removal split still applies
 *
 *  correctChoiceRows
 *   D3  the radio owns the is_correct flag — exactly one correct
 *       answer, other fields preserved with null-safe fallbacks
 *
 *  nextChoiceLabel
 *   D4  the seeded placeholder for the next position
 *
 *  questionDeleteDescription
 *   D5  the copy names the challenge save; null renders no copy
 *
 *  questionMovePair / newlyAddedQuestionId / audioPreviewFor /
 *  audioFilenameFor (reused)
 *   D6  the drag triple and growth detection on challenge rows
 *   D7  the audio preview 3-arm switch and filename switch
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
} from '@/Pages/Dashboard/Lesson/Editor/questionTree';

const freshAudio = () =>
    new File([new ArrayBuffer(8)], 'diction.mp3', { type: 'audio/mpeg' });

const ROWS = [
    { id: 'r1', stored_id: 11, answer_content: 'A', is_correct: false },
    { id: 'r2', stored_id: 22, answer_content: 'B', is_correct: true },
    { id: 'r3', stored_id: 33, answer_content: 'C', is_correct: false },
];

describe('challenge question-tree arms', () => {
    it('D1 — challenge rows carry NO audio_duration field', () => {
        const row = blankQuestionRow({ withAudioDuration: false });

        expect(row).not.toHaveProperty('audio_duration');
        expect(row.type).toBe('text');
        expect(row.answers).toHaveLength(2);
        // The blank factory keys its answers on is_true — the
        // challenge display mapping switches to is_correct.
        expect(row.answers[0].is_true).toBe(true);
        expect(row.answers[0]).not.toHaveProperty('is_correct');
    });

    it('D1 — the removal patch carries no duration clear for challenges', () => {
        const storedPatch = removalPatchFor(null, {
            withAudioDuration: false,
        });

        expect(storedPatch).toEqual({ remove_audio: true });
        expect(storedPatch).not.toHaveProperty('audio_duration');

        const freshPatch = removalPatchFor(freshAudio(), {
            withAudioDuration: false,
        });

        expect(freshPatch).toEqual({ audio: null });
    });

    it('D2 — the fresh/stored removal split still applies', () => {
        expect(removalPatchFor(freshAudio()).audio).toBeNull();
        expect(removalPatchFor(null).remove_audio).toBe(true);
    });

    it('D3 — exactly the chosen row is marked correct via is_correct', () => {
        const rows = correctChoiceRows(ROWS, 2, { correctKey: 'is_correct' });

        expect(rows.map((row) => row.is_correct)).toEqual([false, false, true]);
        expect(rows[0].stored_id).toBe(11);
        expect(rows[1].answer_content).toBe('B');
    });

    it('D3 — bare rows fall back with null-safe fields', () => {
        const rows = correctChoiceRows([{ id: 'r9', stored_id: 5 }], 0, {
            correctKey: 'is_correct',
        });

        expect(rows[0]).toEqual({
            stored_id: 5,
            answer_content: '',
            is_correct: true,
        });
    });

    it('D4 — the next choice is seeded with its placeholder', () => {
        expect(nextChoiceLabel(2)).toBe('Choice 3');
    });

    it('D5 — the copy names the challenge save; null renders no copy', () => {
        expect(questionDeleteDescription(2, 'challenge')).toBe(
            'Are you sure you want to delete Question 3 and its answer choices? The challenge is saved with the question removed.',
        );
        expect(questionDeleteDescription(null, 'challenge')).toBe('');
    });

    it('D6 — the drag triple and growth detection resolve on challenge rows', () => {
        expect(questionMovePair(ROWS, 'r1', 'r3')).toEqual({
            oldIndex: 0,
            newIndex: 2,
        });
        expect(questionMovePair(ROWS, 'r2', 'r2')).toBeNull();
        expect(newlyAddedQuestionId([...ROWS, { id: 'r4' }], ROWS.length)).toBe(
            'r4',
        );
        expect(newlyAddedQuestionId(ROWS, ROWS.length)).toBeNull();
    });

    it('D7 — the audio preview 3-arm switch and filename switch resolve', () => {
        expect(
            audioPreviewFor(freshAudio(), 'blob:preview', false, '/stored.mp3'),
        ).toBe('blob:preview');
        expect(audioPreviewFor(null, null, true, '/stored.mp3')).toBeNull();
        expect(audioPreviewFor(null, null, false, '/stored.mp3')).toBe(
            '/stored.mp3',
        );

        expect(audioFilenameFor(freshAudio(), '/stored.mp3')).toBe(
            'diction.mp3',
        );
        expect(audioFilenameFor(null, '/storage/audio/clip.mp3')).toBe(
            'clip.mp3',
        );
        expect(audioFilenameFor(null, null)).toBeNull();
    });
});
