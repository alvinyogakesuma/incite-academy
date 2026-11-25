import SectionTitle from '@/components/SectionTitle';

export default function SectionHeading({ title, action, className = '' }) {
    return (
        <div
            className={`flex items-center justify-between border-b border-neutral-950/5 pb-3 ${className}`}
        >
            {typeof title === 'string' ? (
                <SectionTitle>{title}</SectionTitle>
            ) : (
                title
            )}
            {action}
        </div>
    );
}
