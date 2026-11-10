import { CirclePile } from 'lucide-react';

export default function Logomark({ size = 'size-6', className = '' }) {
    return <CirclePile className={`${size} text-secondary-300 ${className}`} />;
}
