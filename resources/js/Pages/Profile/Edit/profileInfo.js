/**
 * Student profile — the personal info form's decisions and the
 * header band's derivations.
 *
 * The tab keeps the Radix form wiring and the PATCH dispatch; this
 * module owns the derivations so every outcome is unit testable:
 *
 *  - initialInfoValues  the form's hydration with null-safe
 *                       fallbacks. The nullability map from the
 *                       migration: nim_nip, biography, and
 *                       major_departement_id are nullable columns
 *                       (their guards are live-capable), name is
 *                       NOT NULL (defensive), and the program
 *                       select's id coerces to its string because
 *                       the options ship \texttt value strings.
 *  - infoSubmitValues   the PATCH body — the select's empty value
 *                       goes back as null so the nullable foreign
 *                       key accepts the clear, mirroring the
 *                       backend's nullOnDelete column.
 *  - initialsFor        the header band's two-letter initials from
 *                       the student's name.
 *  - pointsLabel        the header's points formatting with a zero
 *                       fallback (defensive: the column defaults
 *                       0 and never ships null).
 *  - joinedDateLabel    the header's joined date, null-safe
 *                       (defensive: the column is NOT NULL).
 *  - landingErrorsFor   the update flow's error landing — the
 *                       server's field errors arrive as-is, and a
 *                       save without errors (the success path
 *                       re-render) clears to the empty map.
 *  - guardErrorMessageFor  the shell's guard-error toast decision —
 *                       the equip and toggle flows reject with
 *                       'avatar' and 'badge' error keys that land
 *                       on the page props; the badge key wins when
 *                       both arrive.
 */

/**
 * The personal info form's initial values, hydrated from the
 * authenticated student.
 */
export function initialInfoValues(user = {}) {
    return {
        name: user.name ?? '',
        nim_nip: user.nim_nip ?? '',
        email: user.email ?? '',
        major_departement_id:
            user.major_departement_id != null
                ? String(user.major_departement_id)
                : '',
        biography: user.biography ?? '',
    };
}

/**
 * The profile update's PATCH body — the unselected program clears
 * to null.
 */
export function infoSubmitValues(formData) {
    return {
        ...formData,
        major_departement_id: formData.major_departement_id || null,
    };
}

/**
 * The header band's two-letter initials.
 */
export function initialsFor(name) {
    return (name ?? '')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/**
 * The header band's points formatting.
 */
export function pointsLabel(totalPoints) {
    return (totalPoints ?? 0).toLocaleString();
}

/**
 * The header band's joined date.
 */
export function joinedDateLabel(createdAt) {
    return createdAt
        ? new Date(createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
          })
        : null;
}

/**
 * The profile update's error landing — the server's field errors
 * arrive on the fields as-is.
 */
export function landingErrorsFor(serverErrors) {
    return serverErrors ?? {};
}

/**
 * The shell's guard-error toast decision — the message to show, or
 * null when no guard error landed.
 */
export function guardErrorMessageFor(pageErrors) {
    if (pageErrors?.badge || pageErrors?.avatar) {
        return pageErrors.badge ?? pageErrors.avatar;
    }

    return null;
}
