/**
 * Badges management table pipeline — the page-specific search
 * pipeline, the condition chip's lookup, the pluralized label, and
 * the delete flow's decisions. Everything else reuses the covered
 * `courseTable.js` helpers (paginateCourses, PAGE_SIZE_OPTIONS,
 * hasDeletableId):
 *
 *  - filterBadges         the search-only pipeline: title +
 *                         description with the ?? '' guards. The
 *                         structural difference from the courses
 *                         and challenges twins: the deprecated
 *                         page carried no category filter and no
 *                         sort. The nullability split from the
 *                         migration: title is NOT NULL and drafts
 *                         seed it 'Untitled Badge' (defensive),
 *                         description is nullable (live).
 *  - CONDITION_LABELS     the cover chip's type map, humanized for
 *                         the card.
 *  - conditionLabelFor    the chip's lookup — the first condition's
 *                         type humanized; a condition-less badge (a
 *                         fresh draft) ships type null, whose
 *                         lookup yields undefined so the card
 *                         renders no chip at all (live-capable —
 *                         no invented fallback).
 *  - conditionsLabel      the meta pluralization — one condition
 *                         reads singular, everything else plural.
 *  - BADGE_GRADIENT       the family gold cover.
 *  - badgeDeleteUrl       the delete flow's guard-composed URL — a
 *                         deletable pending badge resolves to the
 *                         destroy route, anything else to null, the
 *                         early-return arm.
 *  - badgeDeleteDescription  the delete dialog's copy keyed to the
 *                         pending badge's title, null-safe on the
 *                         object (the closed-state string is
 *                         computed every render but the Radix
 *                         portal is unmounted, so it is never
 *                         displayed).
 */
import { hasDeletableId } from '@/Pages/Dashboard/Courses/courseTable';
import {
    conditionsLabel,
    CONDITION_TYPE_LABELS,
} from '@/components/conditionsLogic';

export const BADGE_GRADIENT =
    'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)';

export const CONDITION_LABELS = CONDITION_TYPE_LABELS;

/**
 * The cover chip's humanized type — undefined for a condition-less
 * badge.
 */
export const conditionLabelFor = (conditionType) =>
    CONDITION_LABELS[conditionType];

/**
 * The meta item's pluralized condition count — re-homed to the
 * conditions module (the conditions domain's single source).
 */
export { conditionsLabel };

/**
 * Search filtering over the badge catalog.
 */
export const filterBadges = (badges, { query }) => {
    const search = query.toLowerCase();

    return badges.filter((badge) => {
        const matchesSearch =
            query === '' ||
            (badge.title ?? '').toLowerCase().includes(search) ||
            (badge.description ?? '').toLowerCase().includes(search);

        return matchesSearch;
    });
};

/**
 * The delete flow's guard-composed URL.
 */
export const badgeDeleteUrl = (badge) =>
    hasDeletableId(badge) ? `/dashboard/badges/${badge.id}` : null;

/**
 * The delete dialog's copy.
 */
export const badgeDeleteDescription = (badge) =>
    `Are you sure you want to delete ${badge?.title}? This will permanently remove this achievement badge.`;
