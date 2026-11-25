/**
 * Avatar schema tests.
 *
 * Covers every decision in avatarSchema.js, mirroring the server's
 * AvatarUpdateRequest — the badge schema's verbatim twin:
 *
 *  buildAvatarSchema
 *   D1  title trim/min/max
 *   D2  description min
 *   D3  the icon chain — File passes, non-File fails
 *   D4  the icon 2 MB boundary
 *   D5  the icon MIME whitelist
 *   D6  the icon is OPTIONAL — nullable with no stored-state
 *       parameter, confirmed on both requirements-driven editors
 *   D7  remove_icon boolean
 *   D8  the logic enum (AND/OR)
 *   D9  conditions REQUIRED — the defining rule
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
    buildAvatarSchema,
} from '../avatarSchema';

const makeIcon = (type = 'image/png', bytes = 1024) =>
    new File([new ArrayBuffer(bytes)], 'icon.png', { type });

const baseForm = (overrides = {}) => ({
    title: 'Scholar Owl Avatar',
    description: 'Earn your first 500 points',
    icon: makeIcon(),
    remove_icon: false,
    logic: 'AND',
    conditions: [{ type: 'points', operator: '>=', value: '500' }],
    ...overrides,
});

describe('buildAvatarSchema — metadata', () => {
    it('D1 — a trimmed title passes; blank and over-long fail', () => {
        const result = buildAvatarSchema().safeParse(
            baseForm({ title: '  Scholar  ' }),
        );

        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Scholar');

        expect(
            buildAvatarSchema().safeParse(baseForm({ title: '   ' })).success,
        ).toBe(false);
        expect(
            buildAvatarSchema().safeParse(baseForm({ title: 'a'.repeat(256) }))
                .success,
        ).toBe(false);
    });

    it('D2 — a blank description fails', () => {
        expect(
            buildAvatarSchema().safeParse(baseForm({ description: '  ' }))
                .success,
        ).toBe(false);
    });
});

describe('buildAvatarSchema — the icon chain', () => {
    it('D3 — a File passes, a non-File fails', () => {
        expect(buildAvatarSchema().safeParse(baseForm()).success).toBe(true);
        expect(
            buildAvatarSchema().safeParse(baseForm({ icon: 'icon.png' }))
                .success,
        ).toBe(false);
    });

    it('D4 — an icon at the size limit passes, a larger one fails', () => {
        expect(
            buildAvatarSchema().safeParse(
                baseForm({
                    icon: makeIcon('image/png', MAX_IMAGE_MB * 1024 * 1024),
                }),
            ).success,
        ).toBe(true);
        expect(
            buildAvatarSchema().safeParse(
                baseForm({
                    icon: makeIcon('image/png', MAX_IMAGE_MB * 1024 * 1024 + 1),
                }),
            ).success,
        ).toBe(false);
    });

    it('D5 — jpeg, png, and webp pass; a gif fails', () => {
        for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
            expect(
                buildAvatarSchema().safeParse(
                    baseForm({ icon: makeIcon(type) }),
                ).success,
            ).toBe(true);
        }

        expect(
            buildAvatarSchema().safeParse(
                baseForm({ icon: makeImage('image/gif') }),
            ).success,
        ).toBe(false);
    });

    it('D6 — the icon is optional: null passes with no stored-state argument', () => {
        // Confirmed on both requirements-driven editors — no
        // image-required 3-way exists.
        expect(
            buildAvatarSchema().safeParse(baseForm({ icon: null })).success,
        ).toBe(true);
    });

    it('D7 — remove_icon accepts booleans only', () => {
        expect(
            buildAvatarSchema().safeParse(baseForm({ remove_icon: true }))
                .success,
        ).toBe(true);
        expect(
            buildAvatarSchema().safeParse(baseForm({ remove_icon: '1' }))
                .success,
        ).toBe(false);
    });
});

describe('buildAvatarSchema — logic and conditions', () => {
    it('D8 — the logic enum accepts AND and OR only', () => {
        expect(
            buildAvatarSchema().safeParse(baseForm({ logic: 'AND' })).success,
        ).toBe(true);
        expect(
            buildAvatarSchema().safeParse(baseForm({ logic: 'OR' })).success,
        ).toBe(true);
        expect(
            buildAvatarSchema().safeParse(baseForm({ logic: 'XOR' })).success,
        ).toBe(false);
    });

    it('D9 — conditions are REQUIRED — the defining rule', () => {
        const result = buildAvatarSchema().safeParse(
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
                buildAvatarSchema().safeParse(
                    baseForm({
                        conditions: [{ type, operator: '>=', value: '500' }],
                    }),
                ).success,
            ).toBe(true);
        }

        expect(
            buildAvatarSchema().safeParse(
                baseForm({
                    conditions: [
                        { type: 'lessons', operator: '>=', value: '500' },
                    ],
                }),
            ).success,
        ).toBe(false);
    });

    it('D11 — the operator enum: all five pass for any type (the lock is UI-only)', () => {
        for (const operator of OPERATORS) {
            expect(
                buildAvatarSchema().safeParse(
                    baseForm({
                        conditions: [
                            { type: 'course', operator, value: 'Course' },
                        ],
                    }),
                ).success,
            ).toBe(true);
        }

        expect(
            buildAvatarSchema().safeParse(
                baseForm({
                    conditions: [
                        { type: 'course', operator: '~', value: 'Course' },
                    ],
                }),
            ).success,
        ).toBe(false);
    });

    it('D12 — the condition\u2019s value is required (strings stay strings on the wire)', () => {
        const result = buildAvatarSchema().safeParse(
            baseForm({
                conditions: [{ type: 'points', operator: '>=', value: '  ' }],
            }),
        );

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toBe('Value is required');
    });

    it('D13 — a fully valid payload passes', () => {
        expect(buildAvatarSchema().safeParse(baseForm()).success).toBe(true);
    });
});

function makeImage(type) {
    return new File([new ArrayBuffer(8)], 'icon.gif', { type });
}
