export default function StatsContainer({ children, className = '' }) {
    return (
        <div
            className={`space-y-2.5 border-t border-neutral-950/5 pt-4 ${className}`}
        >
            {children}
        </div>
    );
}
