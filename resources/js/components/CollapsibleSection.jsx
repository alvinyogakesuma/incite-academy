import { Accordion } from 'radix-ui';
import { ChevronDown, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Radix accordion item that is also a dnd-kit sortable. When `dragId`
 * is present the item registers as draggable and renders a built-in
 * grip handle (the drag source) in front of the header content.
 * `dragDisabled` blocks dragging (e.g. while the title is being
 * renamed inline).
 */
export default function CollapsibleSection({
    value,
    dragId,
    dragDisabled = false,
    header,
    children,
    actions,
    className = '',
}) {
    const sortable = useSortable({
        id: dragId,
        disabled: dragDisabled || !dragId,
    });

    const { attributes, listeners, setNodeRef, transform, transition } =
        sortable;

    const isDragging = dragId ? sortable.isDragging : false;

    return (
        <Accordion.Item
            ref={setNodeRef}
            style={{
                // CSS.Translate discards dnd-kit's scaleX/scaleY (drag
                // size-morphing meant for DragOverlay) — the dragged item
                // keeps its true dimensions and only moves on x/y.
                transform: CSS.Translate.toString(transform),
                transition,
            }}
            value={value}
            className={`overflow-hidden rounded-2xl border border-neutral-950/5 shadow-sm transition-colors duration-200 ${
                isDragging
                    ? 'border-primary-700/50 scale-[0.99] bg-neutral-50 opacity-40'
                    : 'bg-white'
            } ${className}`}
        >
            <Accordion.Header className="flex">
                <div className="group flex w-full items-center justify-between bg-neutral-50/50 px-4 py-3 transition-colors hover:bg-neutral-50/80">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        {dragId && (
                            <div
                                {...attributes}
                                {...listeners}
                                className="shrink-0 cursor-grab text-neutral-500/40 select-none active:cursor-grabbing"
                                title="Drag to reorder"
                            >
                                <GripVertical className="size-4" />
                            </div>
                        )}
                        {header}
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-1.5">
                        {actions}
                        <Accordion.Trigger className="cursor-pointer p-1.5 text-neutral-500 transition-transform group-data-[state=open]:rotate-180">
                            <ChevronDown className="size-4" />
                        </Accordion.Trigger>
                    </div>
                </div>
            </Accordion.Header>
            <Accordion.Content className="space-y-2.5 border-t border-neutral-950/5 bg-white p-4">
                {children}
            </Accordion.Content>
        </Accordion.Item>
    );
}
