import { RotateCcw } from 'lucide-react';

export default function CardGrid({
    items = [],
    renderItem,
    emptyIcon: EmptyIcon,
    emptyTitle,
    emptyMessage,
    onReset,
    resetLabel = 'Reset Filter Options',
}) {
    if (items.length === 0) {
        return (
            <div className="rounded-2xl border border-neutral-950/5 bg-white p-16 text-center shadow-sm">
                <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 text-neutral-500">
                    <div className="bg-primary-50 text-primary-700/60 rounded-full p-4">
                        {EmptyIcon && (
                            <EmptyIcon className="size-8 animate-pulse" />
                        )}
                    </div>
                    <h4 className="font-poppins text-base font-bold text-neutral-950">
                        {emptyTitle}
                    </h4>
                    <p className="font-inter text-caption leading-relaxed text-neutral-500">
                        {emptyMessage}
                    </p>
                    {onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="text-primary-700 mt-2 flex cursor-pointer items-center gap-1 text-xs font-bold hover:underline"
                        >
                            <RotateCcw className="size-3" />
                            <span>{resetLabel}</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
                <div key={item.id}>{renderItem(item)}</div>
            ))}
        </div>
    );
}
