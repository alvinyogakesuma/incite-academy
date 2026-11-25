import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/Button';

export default function AdminFormHeader({
    title,
    backTarget,
    backUrl,
    onBack,
    onSave,
    isSaving = false,
}) {
    return (
        <div className="flex items-center justify-between border-b border-neutral-950/5 pb-5">
            {onBack ? (
                <button
                    type="button"
                    onClick={onBack}
                    className="font-inter text-body-sm group hover:text-primary-700 inline-flex cursor-pointer items-center gap-1.5 font-bold text-neutral-500 transition-colors"
                >
                    <ArrowLeft className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                    <span>Back to {backTarget}</span>
                </button>
            ) : (
                <Link
                    href={backUrl}
                    className="font-inter text-body-sm group hover:text-primary-700 inline-flex cursor-pointer items-center gap-1.5 font-bold text-neutral-500 transition-colors"
                >
                    <ArrowLeft className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                    <span>Back to {backTarget}</span>
                </Link>
            )}

            <Button onClick={onSave} disabled={isSaving} loading={isSaving}>
                Save {title}
            </Button>
        </div>
    );
}
