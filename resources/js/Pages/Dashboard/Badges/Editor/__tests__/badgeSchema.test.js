/**
 * Badge schema tests.
 *
 * Covers every decision in badgeSchema.js, mirroring the server's
 * BadgeUpdateRequest:
 *
 *  buildBadgeSchema
 *   D1  title trim/min/max
 *   D2  description min
 *   D3  the icon chain — File passes, non-File fails
 *   D4  the icon 2 MB boundary
 *   D5  the icon MIME whitelist
 *   D6  the icon is OPTIONAL — nullable with no stored-state
 *       parameter, the family's first editor without the 3-way
 *       cover rule
 *   D7  remove_icon boolean
 *   D8  the logic enum (AND/OR)
 *   D9  conditions REQUIRED — the defining rule (a badge must
 *       earn somehow), the exact opposite of the challenge
 *       editor's optional questions
 *   D10 the condition's type enum (the five humanized types)
 *   D11 the condition's operator enum — all five pass for any
 *       type, mirroring the server (the lock is UI-only)
 *   D12 the condition's value required (the wire keeps strings —
 *       thresholds and titles alike)
 *   D13 the whole schema valid payload
 */
import { describe, it, expect } from 'vitest';
import {
    CONDITION_TYPES,
    MAX_IMAGE_MB,
    OPERATORS,
    buildBadgeSchema,
} from '../badgeSchema';

const makeIcon = (type = 'image/png', bytes = 1024) =>
    new File([new ArrayBuffer(bytes)], 'icon.png', { type });

const baseForm = (overrides = {}) => ({
    title: 'First Steps Badge',
    description: 'Complete your first article lesson',
    icon: makeIcon(),
    remove_icon: false,
    logic: 'AND',
    conditions: [{ type: 'points', operator: '>=', value: '50' }],
    ...overrides,
});

describe('buildBadgeSchema — metadata', () => {
    it('D1 — a trimmed title passes; blank and over-long fail', () => {
        const result = buildBadgeSchema().safeParse(
            baseForm({ title: '  First  ' }),
        );

        expect(result.success).toBe(true);
        expect(result.data.title).toBe('First');

        expect(
            buildBadgeSchema().safeParse(baseForm({ title: '   ' })).success,
        ).toBe(false);
        expect(
            buildBadgeSchema().safeParse(baseForm({ title: 'a'.repeat(256) }))
                .success,
        ).toBe(false);
    });

    it('D2 — a blank description fails', () => {
        expect(
            buildBadgeSchema().safeParse(baseForm({ description: '  ' }))
                .success,
        ).toBe(false);
    });
});

describe('buildBadgeSchema — the icon chain', () => {
    it('D3 — a File passes, a non-File fails', () => {
        expect(buildBadgeSchema().safeParse(baseForm()).success).toBe(true);
        expect(
            buildBadgeSchema().safeParse(baseForm({ icon: 'icon.png' }))
                .success,
        ).toBe(false);
    });

    it('D4 — an icon at the size limit passes, a larger one fails', () => {
        expect(
            buildBadgeSchema().safeParse(
                baseForm({
                    icon: makeIcon('image/png', MAX_IMAGE_MB * 1024 * 1024),
                }),
            ).success,
        ).toBe(true);
        expect(
            buildBadgeSchema().safeParse(
                baseForm({
                    icon: makeIcon('image/png', MAX_IMAGE_MB * 1024 * 1024 + 1),
                }),
            ).success,
        ).toBe(false);
    });

    it('D5 — jpeg, png, and webp pass; a gif fails', () => {
        for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
            expect(
                buildBadgeSchema().safeParse(baseForm({ icon: makeIcon(type) }))
                    .success,
            ).toBe(true);
        }

        expect(
            buildBadgeSchema().safeParse(
                baseForm({ icon: makeImage('image/gif') }),
            ).success,
        ).toBe(false);
    });

    it('D6 — the icon is optional: null passes with no stored-state argument', () => {
        // The family's first editor without the image-required
        // 3-way rule — the schema takes no hasExistingImage at
        // all.
        expect(
            buildBadgeSchema().safeParse(baseForm({ icon: null })).success,
        ).toBe(true);
    });

    it('D7 — remove_icon accepts booleans only', () => {
        expect(
            buildBadgeSchema().safeParse(baseForm({ remove_icon: true }))
                .success,
        ).toBe(true);
        expect(
            buildBadgeSchema().safeParse(baseForm({ remove_icon: '1' }))
                .success,
        ).toBe(false);
    });
});

describe('buildBadgeSchema — logic and conditions', () => {
    it('D8 — the logic enum accepts AND and OR only', () => {
        expect(
            buildBadgeSchema().safeParse(baseForm({ logic: 'AND' })).success,
        ).toBe(true);
        expect(
            buildBadgeSchema().safeParse(baseForm({ logic: 'OR' })).success,
        ).toBe(true);
        expect(
            buildBadgeSchema().safeParse(baseForm({ logic: 'XOR' })).success,
        ).toBe(false);
    });

    it('D9 — conditions are REQUIRED — the badge\u2019s defining rule', () => {
        // The exact opposite of the challenge editor's optional
        // questions: a badge must earn somehow.
        const result = buildBadgeSchema().safeParse(
            baseForm({ conditions: [] }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe(
            'At least one earning condition must be added',
        );
    });

    it('D10 — the condition\u2019s type enum accepts the five types only', () => {
        for (const type of CONDITION_TYPES) {
            expect(
                buildBadgeSchema().safeParse(
                    baseForm({
                        conditions: [{ type, operator: '>=', value: '50' }],
                    }),
                ).success,
            ).toBe(true);
        }

        expect(
            buildBadgeSchema().safeParse(
                baseForm({
                    conditions: [
                        { type: 'lessons', operator: '>=', value: '50' },
                    ],
                }),
            ).success,
        ).toBe(false);
    });

    it('D11 — the operator enum: all five pass for any type (the lock is UI-only)', () => {
        // The server's Rule::in accepts every operator for every
        // type; the numeric/entity lock lives in the select, not
        // the schema.
        for (const operator of OPERATORS) {
            expect(
                buildBadgeSchema().safeParse(
                    baseForm({
                        conditions: [
                            { type: 'course', operator, value: 'Course' },
                        ],
                    }),
                ).success,
            ).toBe(true);
        }

        expect(
            buildBadgeSchema().safeParse(
                baseForm({
                    conditions: [
                        { type: 'course', operator: '~', value: 'Course' },
                    ],
                }),
            ).success,
        ).toBe(false);
    });

    it('D12 — the condition\u2019s value is required (strings stay strings on the wire)', () => {
        const result = buildBadgeSchema().safeParse(
            baseForm({
                conditions: [{ type: 'points', operator: '>=', value: '  ' }],
            }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe('Value is required');
    });

    it('D13 — a fully valid payload passes', () => {
        expect(buildBadgeSchema().safeParse(baseForm()).success).toBe(true);
    });
});

function makeImage(type) {
    return new File([new ArrayBuffer(8)], 'icon.gif', { type });
}
