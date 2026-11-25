/**
 * countWords tests.
 *
 * The helper feeds the article duration/points preview and the
 * lesson schema's empty-content guard, so the counting contract
 * matters: tags are ignored, whitespace runs collapse, and the
 * WYSIWYG's empty document counts as zero words.
 *
 *  D1  null/undefined/empty inputs count as zero
 *  D2  HTML tags are stripped before counting
 *  D3  whitespace runs (including newlines) separate words
 *  D4  the WYSIWYG's empty document markup counts as zero
 *  D5  plain multi-word content counts its words
 */
import { describe, it, expect } from 'vitest';
import countWords from '../countWords';

describe('countWords', () => {
    it('D1 — null, undefined, and empty inputs count as zero', () => {
        expect(countWords(null)).toBe(0);
        expect(countWords(undefined)).toBe(0);
        expect(countWords('')).toBe(0);
    });

    it('D2 — HTML tags are stripped before counting', () => {
        expect(countWords('<p>Hello world</p>')).toBe(2);
        expect(countWords('<h1>One</h1><p>Two three</p>')).toBe(3);
    });

    it('D3 — whitespace runs, including newlines, separate words', () => {
        expect(countWords('one  two\tthree\n\nfour')).toBe(4);
    });

    it('D4 — the WYSIWYG empty document markup counts as zero', () => {
        expect(countWords('<p></p>')).toBe(0);
    });

    it('D5 — plain multi-word content counts its words', () => {
        expect(countWords('The quick brown fox jumps')).toBe(5);
    });
});
