/**
 * Avatars management table pipeline — the badges listing's
 * verbatim twin with its own identity: the search-only pipeline,
 * the character violet cover, and the delete flow's decisions.
 * Everything else reuses the covered homes (`courseTable.js`'s
 * paginateCourses, PAGE_SIZE_OPTIONS, hasDeletableId; the
 * conditions module's conditionTypeLabel and conditionsLabel):
 *
 *  - filterAvatars          the search-only pipeline: title +
 *                           description with the ?? '' guards. The
 *                           nullability split from the migration:
 *                           title is NOT NULL and drafts seed it
 *                           'Untitled Avatar' (defensive),
 *                           description is nullable (live).
 *  - AVATAR_GRADIENT        the character violet cover.
 *  - avatarDeleteUrl        the delete flow's guard-composed URL —
 *                           a deletable pending avatar resolves to
 *                           the destroy route, anything else to
 *                           null, the early-return arm.
 *  - avatarDeleteDescription  the delete dialog's copy keyed to the
 *                           pending avatar's title, null-safe on
 *                           the object (the closed-state string is
 *                           computed every render but the Radix
 *                           portal is unmounted, so it is never
 *                           displayed).
 */
import { hasDeletableId } from '@/Pages/Dashboard/Courses/courseTable';

export const AVATAR_GRADIENT =
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';

/**
 * Search filtering over the avatar catalog.
 */
export const filterAvatars = (avatars, { query }) => {
    const search = query.toLowerCase();

    return avatars.filter((avatar) => {
        const matchesSearch =
            query === '' ||
            (avatar.title ?? '').toLowerCase().includes(search) ||
            (avatar.description ?? '').toLowerCase().includes(search);

        return matchesSearch;
    });
};

/**
 * The delete flow's guard-composed URL.
 */
export const avatarDeleteUrl = (avatar) =>
    hasDeletableId(avatar) ? `/dashboard/avatars/${avatar.id}` : null;

/**
 * The delete dialog's copy.
 */
export const avatarDeleteDescription = (avatar) =>
    `Are you sure you want to delete ${avatar?.title}? This will permanently remove this character avatar.`;
