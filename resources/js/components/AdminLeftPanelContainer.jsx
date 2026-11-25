/**
 * Admin form left panel shell — pure visual container (1/3 column
 * on large screens). Heading and content are supplied as children.
 */
export default function AdminLeftPanelContainer({ children, className = '' }) {
    return (
        <div
            className={`space-y-5 rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm md:p-6 ${className}`}
        >
            {children}
        </div>
    );
}
