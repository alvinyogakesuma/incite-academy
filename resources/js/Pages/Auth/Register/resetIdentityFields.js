/**
 * Whether switching academic status should reset `nim_nip` and
 * `major_departement`.
 *
 * Only crossings of the Mahasiswa boundary reset: the NIM format
 * (9 digits) and the major list are incompatible with the NIP format
 * (18 digits) and the full unit list. Dosen and Staff share both, so
 * a Dosen → Staff switch must keep the fields.
 *
 * DD note: the original inline expression compared the *current*
 * form value against the next value. The pure function takes both
 * statuses explicitly so the decision can be unit tested.
 */
export const shouldResetIdentityFields = (previousStatus, nextStatus) =>
    (previousStatus === 'Mahasiswa') !== (nextStatus === 'Mahasiswa');
