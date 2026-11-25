/**
 * RichTextContent rendering tests.
 *
 * Pins the defect this component exists for: the WYSIWYG editors
 * store bodies as HTML, so question content rendered as a plain
 * text child displayed its literal tags on the take screens. The
 * assertions render through react-dom/server (the same renderer
 * the app's SSR entry uses), so markup output is observable in
 * the node test environment.
 *
 *  D1  stored editor HTML renders as real markup — the literal
 *      tags defect
 *  D2  plain-text content passes through unchanged
 *  D3  the wrapper className reaches the div, so each page's
 *      typography still applies
 *  D4  a null/undefined body renders an empty container (the
 *      payloads carry question content nullable)
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RichTextContent from '../RichTextContent';

const render = (html, className) =>
    renderToStaticMarkup(createElement(RichTextContent, { html, className }));

describe('RichTextContent', () => {
    it('D1 — renders stored editor HTML as real markup, not literal tags', () => {
        expect(render('<p>What is <strong>skimming</strong>?</p>')).toBe(
            '<div class=""><p>What is <strong>skimming</strong>?</p></div>',
        );
    });

    it('D2 — plain-text content passes through unchanged', () => {
        expect(render('What is skimming?')).toBe(
            '<div class="">What is skimming?</div>',
        );
    });

    it('D3 — carries the wrapper className through', () => {
        expect(render('Body', 'font-inter text-body-sm')).toBe(
            '<div class="font-inter text-body-sm">Body</div>',
        );
    });

    it('D4 — a missing body renders an empty container', () => {
        expect(render(null)).toBe('<div class=""></div>');
        expect(render(undefined)).toBe('<div class=""></div>');
    });
});
