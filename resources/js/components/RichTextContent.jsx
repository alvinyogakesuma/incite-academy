/**
 * Admin-authored rich text rendered as real markup. The WYSIWYG
 * editors store bodies as HTML (TipTap always wraps text in <p>
 * rows), so content authored in them must reach the browser
 * through dangerouslySetInnerHTML — a plain text child would
 * display the stored tags literally. The html prop carries
 * trusted editor output (the same trust level article bodies
 * already have), never student input. The wrapper is a div, never
 * a <p>, so the stored inner paragraphs stay valid HTML.
 */
export default function RichTextContent({ html, className = '' }) {
    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: html ?? '' }}
        />
    );
}
