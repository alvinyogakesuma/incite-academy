/**
 * Pagination windowing tests.
 *
 * Covers every decision in pageItems:
 *  D1  totalPages <= 5 → every page number renders, no ellipsis
 *  D2  single page → just that page
 *  D3  totalPages > 5, current near the start
 *      (edge + neighborhood shown; one ellipsis before the last page)
 *  D4  current in the middle → two ellipses
 *  D5  current near the end → one ellipsis after the first page
 *  D6  ellipsis placement collapses to page 2 / page totalPages - 1
 *  D7  the current page itself always renders
 */
import { describe, it, expect } from 'vitest';
import { pageItems } from '../paginationPages';

const pages = (currentPage, totalPages) =>
    pageItems(currentPage, totalPages).map((item) =>
        item.type === 'ellipsis' ? '...' : item.page,
    );

describe('pageItems', () => {
    it('D1 — renders every page when totalPages is 5 or fewer', () => {
        expect(pages(1, 5)).toEqual([1, 2, 3, 4, 5]);
        expect(pages(3, 4)).toEqual([1, 2, 3, 4]);
    });

    it('D2 — a single total page renders just that page', () => {
        expect(pages(1, 1)).toEqual([1]);
    });

    it('D3 — current near the start keeps the leading neighborhood', () => {
        // page 1 of 6: 1, 2 (neighbor), ..., 6 (edge)
        expect(pages(1, 6)).toEqual([1, 2, '...', 6]);
        expect(pages(2, 6)).toEqual([1, 2, 3, '...', 6]);
    });

    it('D4 — a middle current page renders two ellipses', () => {
        expect(pages(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);
        expect(pages(4, 6)).toEqual([1, '...', 3, 4, 5, 6]);
    });

    it('D5 — current near the end keeps the trailing neighborhood', () => {
        expect(pages(10, 10)).toEqual([1, '...', 9, 10]);
        expect(pages(6, 6)).toEqual([1, '...', 5, 6]);
    });

    it('D6 — the ellipsis collapses the whole gap to one marker', () => {
        // page 2 of 20: gap 3..19 must render a single '...' at slot 19
        expect(pages(2, 20)).toEqual([1, 2, 3, '...', 20]);
        // page 19 of 20: gap 3..18 must render a single '...' at slot 2
        expect(pages(19, 20)).toEqual([1, '...', 18, 19, 20]);
    });

    it('D7 — the current page is always rendered even mid-gap', () => {
        // current page 7 of 8 sits next to both edges' neighborhoods
        expect(pages(7, 8)).toEqual([1, '...', 6, 7, 8]);
        expect(pages(1, 8)).toEqual([1, 2, '...', 8]);
    });
});
