/**
 * toastFrom tests.
 *
 * Covers the four decisions in the module:
 *  D1  `error || status` — error wins when both are set (the
 *      description-priority decision)
 *  D2  `if (!description)` — neither present → null (the effect then
 *      keeps the toast's prior state instead of closing it)
 *  D3  `error ? 'error' : 'success'` — the toast type
 *  D4  `error ? 'Sign In Failed' : 'Success'` — the toast title;
 *      must stay in sync with D3
 */
import { describe, it, expect } from 'vitest';
import { toastFrom } from '../authToast';

const googleError =
    'Only ITERA institutional Google accounts (@itera.ac.id) may sign in.';
const resetStatus = 'Your password has been reset.';

describe('toastFrom', () => {
    it('D2 — returns null when neither error nor status is present', () => {
        expect(toastFrom(null, null)).toBeNull();
        expect(toastFrom(undefined, undefined)).toBeNull();
    });

    it('D2 — returns null for an empty-string error without status', () => {
        expect(toastFrom('', null)).toBeNull();
    });

    it('D1/D3/D4 error side — an error yields an open error toast', () => {
        const toast = toastFrom(googleError, null);

        expect(toast).toEqual({
            open: true,
            type: 'error',
            title: 'Sign In Failed',
            description: googleError,
        });
    });

    it('D1/D3/D4 success side — a status yields an open success toast', () => {
        const toast = toastFrom(null, resetStatus);

        expect(toast).toEqual({
            open: true,
            type: 'success',
            title: 'Success',
            description: resetStatus,
        });
    });

    it('D1 — error wins when both error and status are set', () => {
        const toast = toastFrom(googleError, resetStatus);

        expect(toast.type).toBe('error');
        expect(toast.title).toBe('Sign In Failed');
        expect(toast.description).toBe(googleError);
    });

    it('D1 — an empty-string error falls back to the status', () => {
        // The Google flow shares `error` as null until a failure, so the
        // falsy-error path is the common one for success toasts.
        const toast = toastFrom('', resetStatus);

        expect(toast.type).toBe('success');
        expect(toast.description).toBe(resetStatus);
    });

    it('D3/D4 — type and title stay in sync on both sides', () => {
        const errorToast = toastFrom(googleError, null);
        expect(errorToast.type).toBe('error');
        expect(errorToast.title).toBe('Sign In Failed');

        const successToast = toastFrom(null, resetStatus);
        expect(successToast.type).toBe('success');
        expect(successToast.title).toBe('Success');
    });
});
