export default function SectionTitle({ children, className = '' }) {
    return (
        <h3
            className={`font-poppins text-body font-bold text-neutral-950 ${className}`}
        >
            {children}
        </h3>
    );
}
