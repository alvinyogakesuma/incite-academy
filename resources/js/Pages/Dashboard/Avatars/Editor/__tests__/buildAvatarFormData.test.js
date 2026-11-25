/**
 * buildAvatarFormData tests.
 *
 * The builder is the wire-format contract: the condition rows in
 * PHP bracket notation, files as-is, and booleans as '1'/'0' — and
 * the hydration owns the editor's defaults.
 *
 *  buildAvatarFormData
 *   D1  every payload rides the method-spoofed PUT
 *   D2  metadata always rides (title, description, logic)
 *   D3  the icon rides only when it is a File
 *   D4  remove_icon rides as '1'/'0'
 *   D5  the condition rows nest in bracket notation
 *   D6  tolerant inputs — a missing conditions array contributes
 *       nothing
 *
 *  initialAvatarValues
 *   D7  a stored avatar hydrates every field with fallbacks
 *   D8  no avatar hydrates the blank draft's defaults (the
 *       draft-first create's visible state)
 *   D9  bare condition rows hydrate every per-row fallback
 */
import { describe, it, expect } from 'vitest';
import buildAvatarFormData, {
    initialAvatarValues,
} from '../buildAvatarFormData';

const makeValues = (overrides = {}) => ({
    title: 'Scholar Owl Avatar',
    description: 'Earn your first 500 points',
    icon: null,
    remove_icon: false,
    logic: 'AND',
    conditions: [{ type: 'points', operator: '>=', value: '500' }],
    ...overrides,
});

describe('buildAvatarFormData', () => {
    it('D1 — the payload rides the method-spoofed PUT', () => {
        const data = buildAvatarFormData(makeValues());

        expect(data.get('_method')).toBe('put');
        expect(data.get('title')).toBe('Scholar Owl Avatar');
    });

    it('D2 — metadata always rides', () => {
        const data = buildAvatarFormData(makeValues());

        expect(data.get('description')).toBe('Earn your first 500 points');
        expect(data.get('logic')).toBe('AND');
    });

    it('D3 — the icon rides only when it is a File', () => {
        const withIcon = makeValues({
            icon: new File([new ArrayBuffer(8)], 'icon.png', {
                type: 'image/png',
            }),
        });

        expect(buildAvatarFormData(withIcon).get('icon')).toBeInstanceOf(File);
        expect(buildAvatarFormData(makeValues()).get('icon')).toBeNull();
    });

    it("D4 — remove_icon rides as '1'/'0'", () => {
        expect(buildAvatarFormData(makeValues()).get('remove_icon')).toBe('0');
        expect(
            buildAvatarFormData(makeValues({ remove_icon: true })).get(
                'remove_icon',
            ),
        ).toBe('1');
    });

    it('D5 — the condition rows nest in bracket notation', () => {
        const data = buildAvatarFormData(
            makeValues({
                conditions: [
                    { type: 'points', operator: '>=', value: '500' },
                    {
                        type: 'challenge',
                        operator: '=',
                        value: 'Dictation Duel',
                    },
                ],
            }),
        );

        expect(data.get('conditions[0][type]')).toBe('points');
        expect(data.get('conditions[0][value]')).toBe('500');
        expect(data.get('conditions[1][type]')).toBe('challenge');
        expect(data.get('conditions[1][value]')).toBe('Dictation Duel');
    });

    it('D6 — tolerant inputs: a missing conditions array contributes nothing', () => {
        const noConditions = buildAvatarFormData(
            makeValues({ conditions: undefined }),
        );

        expect(
            Array.from(noConditions.keys()).includes('conditions[0][type]'),
        ).toBe(false);
    });
});

describe('initialAvatarValues', () => {
    it('D7 — a stored avatar hydrates every field with fallbacks', () => {
        const values = initialAvatarValues({
            title: 'Scholar Owl Avatar',
            description: 'Earn your first 500 points',
            logic: 'OR',
            conditions: [
                { type: 'course', operator: '=', value: 'English Basics' },
            ],
        });

        expect(values).toEqual({
            title: 'Scholar Owl Avatar',
            description: 'Earn your first 500 points',
            icon: null,
            remove_icon: false,
            logic: 'OR',
            conditions: [
                { type: 'course', operator: '=', value: 'English Basics' },
            ],
        });
    });

    it('D8 — no avatar hydrates the blank draft\u2019s defaults', () => {
        // The draft-first create's visible state: the AND logic,
        // no conditions, no icon.
        expect(initialAvatarValues(null)).toEqual({
            title: '',
            description: '',
            icon: null,
            remove_icon: false,
            logic: 'AND',
            conditions: [],
        });
    });

    it('D9 — bare condition rows hydrate every per-row fallback', () => {
        const values = initialAvatarValues({
            conditions: [{ type: null, operator: null, value: null }],
        });

        expect(values.conditions).toEqual([
            { type: 'points', operator: '>=', value: '' },
        ]);
    });
});
