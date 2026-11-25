import { Edit2, Trash2 } from 'lucide-react';
import { ActionTooltip } from './UserRow';

export default function CourseCard({
    title,
    description,
    gradient,
    imageUrl = null,
    status = 'published',
    icon: Icon,
    badgeText,
    metaItems = [],
    onEdit,
    onDelete,
    editTooltip = 'Edit item',
    deleteTooltip = 'Delete item',
}) {
    return (
        <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-950/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            {/* Cover Thumbnail / Gradient with overlay icon */}
            <div
                style={{
                    background: imageUrl ? undefined : gradient,
                    height: '150px',
                }}
                className="relative flex w-full shrink-0 items-center justify-center overflow-hidden"
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    Icon && (
                        <Icon
                            style={{ width: '48px', height: '48px' }}
                            className="relative z-10 text-white/90 drop-shadow-md transition-transform duration-300 group-hover:scale-110"
                        />
                    )
                )}
                <div className="pointer-events-none absolute inset-0 bg-black/15" />

                {status === 'draft' && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                        }}
                        className="font-inter text-caption rounded-full border border-white/20 bg-neutral-950/70 px-2.5 py-1 font-bold tracking-wider text-white uppercase backdrop-blur-md"
                    >
                        Draft
                    </span>
                )}

                {/* Badge overlay */}
                {badgeText && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                        }}
                        className="font-inter text-caption rounded-full border border-white/30 bg-white/20 px-2.5 py-1 font-bold tracking-wider text-white uppercase backdrop-blur-md"
                    >
                        {badgeText}
                    </span>
                )}
            </div>

            {/* Card Content details */}
            <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex-1 space-y-1.5">
                    <h3
                        className="font-poppins group-hover:text-primary-700 text-body-sm line-clamp-1 leading-snug font-bold text-neutral-950 transition-colors"
                        title={title}
                    >
                        {title}
                    </h3>
                    <p className="font-inter text-caption line-clamp-2 leading-relaxed text-neutral-500">
                        {description}
                    </p>
                </div>

                {/* Badges metadata list */}
                {metaItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-neutral-950/5 pt-2">
                        {metaItems.map((item, idx) => {
                            const MetaIcon = item.icon;
                            return (
                                <span
                                    key={idx}
                                    className="font-inter text-caption bg-primary-50 inline-flex items-center gap-1 rounded-lg border border-neutral-950/5 px-2.5 py-1 font-medium text-neutral-500"
                                >
                                    {MetaIcon && (
                                        <MetaIcon className="size-3 text-neutral-500" />
                                    )}
                                    <span>{item.label}</span>
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Action buttons row */}
                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="font-inter hover:bg-primary-700 hover:border-primary-700 bg-primary-50 group/btn flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-950/5 px-4 py-2 text-xs font-bold text-neutral-950 transition-all duration-200 hover:text-white"
                        title={editTooltip}
                    >
                        <Edit2 className="size-3 text-neutral-500 transition-colors group-hover/btn:text-white" />
                        <span>Edit</span>
                    </button>
                    <ActionTooltip label={deleteTooltip}>
                        <button
                            type="button"
                            onClick={onDelete}
                            aria-label={deleteTooltip}
                            className="hover:bg-error-50 hover:border-error-100 hover:text-error-600 bg-primary-50 flex cursor-pointer items-center justify-center rounded-xl border border-neutral-950/5 p-2 text-neutral-500 transition-all duration-200"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </ActionTooltip>
                </div>
            </div>
        </div>
    );
}
