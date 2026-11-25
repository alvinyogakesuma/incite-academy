/**
 * Pagination page windowing.
 *
 * Maps (currentPage, totalPages) to the list of items the pagination
 * controls should render:
 *
 *  - { type: 'page', page }    a clickable page number
 *  - { type: 'ellipsis' }      a "..." gap placeholder
 *
 * Rules (mirrors the previous inline logic):
 *  - With 5 or fewer pages, every page number is rendered.
 *  - Otherwise the first and last pages always render, plus every
 *    page within 1 of the current page; the gaps collapse to a single
 *    ellipsis rendered at the gap's edge slot (page 2 or page
 *    totalPages - 1).
 */
const MAX_VISIBLE_WITHOUT_ELLIPSIS = 5;

export const pageItems = (currentPage, totalPages) => {
    const items = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
        const isEdgePage = pageNum === 1 || pageNum === totalPages;

        if (
            totalPages > MAX_VISIBLE_WITHOUT_ELLIPSIS &&
            Math.abs(currentPage - pageNum) > 1 &&
            !isEdgePage
        ) {
            if (pageNum === 2 || pageNum === totalPages - 1) {
                items.push({ type: 'ellipsis' });
            }
            continue;
        }

        items.push({ type: 'page', page: pageNum });
    }

    return items;
};
