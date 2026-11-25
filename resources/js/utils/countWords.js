/**
 * Word count for WYSIWYG content — tags are stripped, the
 * remaining text splits on whitespace runs. Mirrors the
 * server-side derivation used for article duration and points.
 */
export default function countWords(html) {
    return String(html ?? '')
        .replace(/<[^>]*>/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
}
