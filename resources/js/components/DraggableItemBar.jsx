import { Link } from '@inertiajs/react';
import {
    GripVertical,
    BookOpen,
    HelpCircle,
    Award,
    Pencil,
    Trash2,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const getItemIcon = (type) => {
    switch (type) {
        case 'article':
            return BookOpen;
        case 'quiz':
            return HelpCircle;
        case 'exam':
            return Award;
        default:
            return BookOpen;
    }
};

const getItemBadgeClass = (type) => {
    switch (type) {
        case 'article':
            return 'bg-primary-50 text-primary-700 border border-primary-100';
        case 'quiz':
            return 'bg-warning-50 text-warning-700 border border-warning-100';
        case 'exam':
            return 'bg-success-50 text-success-700 border border-success-100';
        default:
            return 'bg-neutral-50 text-neutral-700 border border-neutral-100';
    }
};

const getItemIconClass = (type) => {
    switch (type) {
        case 'article':
            return 'bg-primary-50 text-primary-600';
        case 'quiz':
            return 'bg-warning-50 text-warning-600';
        default:
            return 'bg-success-50 text-success-600';
    }
};

/**
 * Lesson bar inside a module — a dnd-kit sortable whose built-in grip
 * is the drag source. Renaming (isEditing) disables dragging, same as
 * the old native-DnD behavior.
 */
export default function DraggableItemBar({
    item,
    indexText,
    isEditing = false,
    editInput,
    onTitleClick,
    onDelete,
    editHref,
    onEditLesson,
    className = '',
}) {
    const sortable = useSortable({ id: item.id, disabled: isEditing });

    const { attributes, listeners, setNodeRef, transform, transition } =
        sortable;
    const isDragging = sortable.isDragging;
    const IconComponent = getItemIcon(item.type);
    const badgeClass = getItemBadgeClass(item.type);
    const iconClass = getItemIconClass(item.type);

    return (
        <div
            ref={setNodeRef}
            style={{
                // CSS.Translate discards dnd-kit's scaleX/scaleY (drag
                // size-morphing meant for DragOverlay) — the dragged item
                // keeps its true dimensions and only moves on x/y.
                transform: CSS.Translate.toString(transform),
                transition,
            }}
            className={`group/item flex items-center justify-between rounded-xl border border-neutral-950/5 p-3 transition-colors hover:border-neutral-950/10 hover:bg-neutral-50/40 ${
                isDragging
                    ? 'border-primary-700/50 bg-neutral-100 opacity-40'
                    : 'bg-white'
            } ${className}`}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div
                    {...attributes}
                    {...listeners}
                    className="shrink-0 cursor-grab text-neutral-500/30 select-none active:cursor-grabbing"
                    title="Drag to reorder"
                >
                    <GripVertical className="size-3.5" />
                </div>
                <div className={`shrink-0 rounded-lg p-1.5 ${iconClass}`}>
                    <IconComponent className="size-3.5" />
                </div>

                {isEditing ? (
                    <div
                        className="flex min-w-0 flex-1 items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {editInput}
                    </div>
                ) : (
                    <>
                        <span
                            onClick={onTitleClick}
                            className="font-inter text-body-sm cursor-pointer truncate font-medium text-neutral-950 select-none"
                        >
                            {indexText} {item.title}
                        </span>
                        <span
                            onClick={onTitleClick}
                            className={`font-inter text-caption shrink-0 cursor-pointer rounded-full px-2 py-0.5 font-bold tracking-wider uppercase select-none ${badgeClass}`}
                        >
                            {item.type}
                        </span>
                    </>
                )}
            </div>

            <div className="ml-2 flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover/item:opacity-100">
                {(() => {
                    const editButtonClass =
                        'flex cursor-pointer items-center justify-center rounded-lg border border-neutral-950/5 bg-white p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950';

                    return editHref ? (
                        <Link
                            href={editHref}
                            className={editButtonClass}
                            title="Edit Lesson"
                        >
                            <Pencil className="size-3" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onEditLesson?.(item)}
                            className={editButtonClass}
                            title="Edit Lesson"
                        >
                            <Pencil className="size-3" />
                        </button>
                    );
                })()}
                <button
                    type="button"
                    onClick={onDelete}
                    className="hover:bg-error-50 hover:text-error-500 cursor-pointer rounded-lg border border-neutral-950/5 bg-white p-1 text-neutral-500 transition-colors"
                    title="Delete Item"
                >
                    <Trash2 className="size-3" />
                </button>
            </div>
        </div>
    );
}
