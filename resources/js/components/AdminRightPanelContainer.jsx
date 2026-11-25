/**
 * Admin form right panel shell — pure visual container (2/3 column
 * on large screens). Heading and content are supplied as children.
 */
export default function AdminRightPanelContainer({ children, className = '' }) {
    return (
        <div
            className={`space-y-6 rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm md:p-6 lg:col-span-2 ${className}`}
        >
            {children}
        </div>
    );
}
