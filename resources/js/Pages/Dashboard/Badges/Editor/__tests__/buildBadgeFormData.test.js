/**
 * buildBadgeFormData tests.
 *
 * The builder is the wire-format contract: the condition rows in
 * PHP bracket notation, files as-is, and booleans as '1'/'0' — and
 * the hydration owns the editor's defaults.
 *
 *  buildBadgeFormData
 *   D1  every payload rides the method-spoofed PUT
 *   D2  metadata always rides (title, description, logic)
 *   D3  the icon rides only when it is a File
 *   D4  remove_icon rides as '1'/'0'
 *   D5  the condition rows nest in bracket notation
 *   D6  tolerant inputs — a missing conditions array contributes
 *       nothing
 *
 *  initialBadgeValues
 *   D7  a stored badge hydrates every field with fallbacks
 *   D8  no badge hydrates the blank draft's defaults (the
 *       draft-first create's visible state — the AND logic, no
 *       conditions, no icon)
 *   D9  bare condition rows hydrate every per-row fallback
 */
import { describe, it, expect } from 'vitest';
import buildBadgeFormData, { initialBadgeValues } from '../buildBadgeFormData';

const makeValues = (overrides = {}) => ({
    title: 'First Steps Badge',
    description: 'Complete your first article lesson',
    icon: null,
    remove_icon: false,
    logic: 'AND',
    conditions: [{ type: 'points', operator: '>=', value: '50' }],
    ...overrides,
});

describe('buildBadgeFormData', () => {
    it('D1 — the payload rides the method-spoofed PUT', () => {
        const data = buildBadgeFormData(makeValues());

        expect(data.get('_method')).toBe('put');
        expect(data.get('title')).toBe('First Steps Badge');
    });

    it('D2 — metadata always rides', () => {
        const data = buildBadgeFormData(makeValues());

        expect(data.get('description')).toBe(
            'Complete your first article lesson',
        );
        expect(data.get('logic')).toBe('AND');
    });

    it('D3 — the icon rides only when it is a File', () => {
        const withIcon = makeValues({
            icon: new File([new ArrayBuffer(8)], 'icon.png', {
                type: 'image/png',
            }),
        });

        expect(buildBadgeFormData(withIcon).get('icon')).toBeInstanceOf(File);
        expect(buildBadgeFormData(makeValues()).get('icon')).toBeNull();
    });

    it("D4 — remove_icon rides as '1'/'0'", () => {
        expect(buildBadgeFormData(makeValues()).get('remove_icon')).toBe('0');
        expect(
            buildBadgeFormData(makeValues({ remove_icon: true })).get(
                'remove_icon',
            ),
        ).toBe('1');
    });

    it('D5 — the condition rows nest in bracket notation', () => {
        const data = buildBadgeFormData(
            makeValues({
                conditions: [
                    { type: 'points', operator: '>=', value: '50' },
                    { type: 'quiz', operator: '<=', value: '100' },
                ],
            }),
        );

        expect(data.get('conditions[0][type]')).toBe('points');
        expect(data.get('conditions[0][operator]')).toBe('>=');
        expect(data.get('conditions[0][value]')).toBe('50');
        expect(data.get('conditions[1][type]')).toBe('quiz');
        expect(data.get('conditions[1][value]')).toBe('100');
    });

    it('D6 — tolerant inputs: a missing conditions array contributes nothing', () => {
        const noConditions = buildBadgeFormData(
            makeValues({ conditions: undefined }),
        );

        expect(
            Array.from(noConditions.keys()).includes('conditions[0][type]'),
        ).toBe(false);
    });
});

describe('initialBadgeValues', () => {
    it('D7 — a stored badge hydrates every field with fallbacks', () => {
        const values = initialBadgeValues({
            title: 'First Steps Badge',
            description: 'Complete your first article lesson',
            logic: 'OR',
            conditions: [
                { type: 'course', operator: '=', value: 'English Basics' },
            ],
        });

        expect(values).toEqual({
            title: 'First Steps Badge',
            description: 'Complete your first article lesson',
            icon: null,
            remove_icon: false,
            logic: 'OR',
            conditions: [
                { type: 'course', operator: '=', value: 'English Basics' },
            ],
        });
    });

    it('D8 — no badge hydrates the blank draft\u2019s defaults', () => {
        // The draft-first create's visible state: the AND logic,
        // no conditions, no icon.
        expect(initialBadgeValues(null)).toEqual({
            title: '',
            description: '',
            icon: null,
            remove_icon: false,
            logic: 'AND',
            conditions: [],
        });
    });

    it('D9 — bare condition rows hydrate every per-row fallback', () => {
        const values = initialBadgeValues({
            conditions: [{ type: null, operator: null, value: null }],
        });

        expect(values.conditions).toEqual([
            { type: 'points', operator: '>=', value: '' },
        ]);
    });
});
