/**
 * Login toast derivation.
 *
 * Maps the shared `error` and `status` page props to the Toast state.
 * Both are one-request flashes on the login route:
 *  - `error`  — a failed Google sign-in (GoogleAuthController redirects
 *    back with an 'error' flash, shared by HandleInertiaRequests).
 *  - `status` — a successful password reset (NewPasswordController
 *    redirects to login with a 'status' flash).
 *
 * Returns null when neither is present so the effect keeps the
 * toast's prior state instead of closing it.
 */
export const toastFrom = (error, status) => {
    const description = error || status;

    if (!description) {
        return null;
    }

    return {
        open: true,
        type: error ? 'error' : 'success',
        title: error ? 'Sign In Failed' : 'Success',
        description,
    };
};
