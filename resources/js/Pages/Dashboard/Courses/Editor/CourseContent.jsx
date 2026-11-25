import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Accordion } from 'radix-ui';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Trash2 } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import CollapsibleSection from '@/components/CollapsibleSection';
import DraggableItemBar from '@/components/DraggableItemBar';
import InlineTitleInput from '@/components/InlineTitleInput';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import Button from '@/components/Button';
import {
    deleteDialogDescription,
    expandedIdsWith,
    initialOpenModuleIds,
    lessonDeleteDialogDescription,
    lessonKey,
    moduleValue,
    newlyAddedModuleValue,
    renameItem,
    resolveDragOrder,
} from './courseOutline';

// Drag activation demands a small movement so clicks (accordion
// toggles, buttons, links) never start drags; the keyboard sensor
// keeps the grips accessible.
const useOutlineSensors = () =>
    useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

/**
 * Course content — the module/lesson outline rendered from the
 * course's stored tree. Add Module and each module's Add Item /
 * Delete buttons create and remove rows on the server (a partial
 * reload refreshes the tree); the grips drag rows into a new
 * order, which settles optimistically in place and persists via
 * the reorder endpoints (the partial reload lands the
 * authoritative order). The delete buttons open a confirmation and
 * remove the row server-side; the lesson pencil opens the editor
 * and inline rename persists through the rename endpoint.
 */
export default function CourseContent({ course = {} }) {
    const sensors = useOutlineSensors();

    const modules = useMemo(() => course.modules ?? [], [course.modules]);

    // Optimistic module order — a drag settles instantly, the
    // reorder round-trip (partial reload) lands the authoritative
    // order, and an error reverts to the prop order.
    const [orderedModules, setOrderedModules] = useState(modules);
    useEffect(() => {
        setOrderedModules(modules);
    }, [modules]);

    // The first module starts expanded so a populated outline is
    // never a wall of collapsed headers.
    const [openModuleIds, setOpenModuleIds] = useState(() =>
        initialOpenModuleIds(modules),
    );

    const [isAdding, setIsAdding] = useState(false);

    // The module pending a delete confirmation — its section stays
    // rendered until the dialog is confirmed.
    const [moduleToDelete, setModuleToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // A freshly created module opens expanded — the server visit
    // swaps the course prop without remounting this component, so
    // growth is detected by comparing counts.
    const prevModuleCountRef = useRef(orderedModules.length);
    useEffect(() => {
        const addedValue = newlyAddedModuleValue(
            orderedModules,
            prevModuleCountRef.current,
        );

        if (addedValue) {
            setOpenModuleIds((prev) => expandedIdsWith(prev, addedValue));
        }

        prevModuleCountRef.current = orderedModules.length;
    }, [orderedModules]);

    // Add creates the module server-side — a partial reload of the
    // course prop lands the new row in the outline.
    const handleAddModule = () => {
        if (isAdding) {
            return;
        }

        router.post(
            `/dashboard/courses/${course.id}/modules`,
            {},
            {
                only: ['course'],
                onStart: () => setIsAdding(true),
                onFinish: () => setIsAdding(false),
            },
        );
    };

    // Confirm deletes the module server-side — lessons cascade via
    // the foreign key, and the partial reload drops the section.
    const handleConfirmDeleteModule = () => {
        router.delete(`/dashboard/modules/${moduleToDelete?.id}`, {
            only: ['course'],
            onStart: () => setIsDeleting(true),
            onFinish: () => setIsDeleting(false),
            onSuccess: () => setModuleToDelete(null),
        });
    };

    // A module drag reorders the outline optimistically, then the
    // reorder endpoint rewrites the stored order_index — the
    // partial reload confirms it.
    const handleModuleDragEnd = ({ active, over }) => {
        const nextModules = resolveDragOrder(
            orderedModules,
            active.id,
            over?.id,
        );

        if (!nextModules) {
            return;
        }

        setOrderedModules(nextModules);

        router.put(
            `/dashboard/courses/${course.id}/modules/reorder`,
            { module_order: nextModules.map((module) => module.id) },
            {
                only: ['course'],
                onError: () => setOrderedModules(modules),
            },
        );
    };

    // A rename settles optimistically in the module mirror, then
    // the rename endpoint persists it — the partial reload lands
    // the authoritative title.
    const handleRenameModule = (module, nextTitle) => {
        setOrderedModules((prev) => renameItem(prev, module.id, nextTitle));

        router.put(
            `/dashboard/modules/${module.id}`,
            { title: nextTitle },
            {
                only: ['course'],
                onError: () => setOrderedModules(modules),
            },
        );
    };

    return (
        <div className="space-y-6">
            <SectionHeading
                title="Course Content"
                action={
                    <Button onClick={handleAddModule} loading={isAdding}>
                        <Plus className="size-4 shrink-0" />
                        Add Module
                    </Button>
                }
            />

            {orderedModules.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleModuleDragEnd}
                >
                    <SortableContext
                        items={orderedModules.map((module) => module.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <Accordion.Root
                            type="multiple"
                            value={openModuleIds}
                            onValueChange={setOpenModuleIds}
                            className="space-y-4"
                        >
                            {orderedModules.map((module, moduleIndex) => (
                                <ModuleSection
                                    key={module.id ?? `module-${moduleIndex}`}
                                    module={module}
                                    moduleIndex={moduleIndex}
                                    courseId={course.id}
                                    onEnsureExpanded={(value) =>
                                        setOpenModuleIds((prev) =>
                                            expandedIdsWith(prev, value),
                                        )
                                    }
                                    onRequestDeleteModule={() =>
                                        setModuleToDelete(module)
                                    }
                                    onRenameModule={handleRenameModule}
                                />
                            ))}
                        </Accordion.Root>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="rounded-2xl border border-dashed border-neutral-950/10 bg-neutral-50/10 py-16 text-center">
                    <p className="font-inter text-body-sm text-neutral-500">
                        Create modules to structure your course contents.
                    </p>
                    <button
                        type="button"
                        onClick={handleAddModule}
                        disabled={isAdding}
                        className="font-inter text-body-sm text-primary-700 mt-2 cursor-pointer font-bold hover:underline disabled:pointer-events-none disabled:opacity-50"
                    >
                        Create your first module
                    </button>
                </div>
            )}

            <DeleteConfirmationDialog
                open={Boolean(moduleToDelete)}
                onOpenChange={(open) => !open && setModuleToDelete(null)}
                title="Delete Module"
                description={deleteDialogDescription(moduleToDelete)}
                confirmLabel="Delete Module"
                onConfirm={handleConfirmDeleteModule}
                isSubmitting={isDeleting}
            />
        </div>
    );
}

/**
 * One module of the outline — an accordion section rendering its
 * stored lesson bars and owning its Add Item / Delete buttons. The
 * bars drag into a new order within this module only (the reorder
 * endpoint is module-scoped), and the module and lesson titles
 * rename inline.
 */
function ModuleSection({
    module = {},
    moduleIndex,
    courseId,
    onEnsureExpanded,
    onRequestDeleteModule,
    onRenameModule,
}) {
    const sensors = useOutlineSensors();

    const lessons = useMemo(() => module.lessons ?? [], [module.lessons]);

    // Optimistic lesson order — same shape as the module order.
    const [orderedLessons, setOrderedLessons] = useState(lessons);
    useEffect(() => {
        setOrderedLessons(lessons);
    }, [lessons]);

    const value = moduleValue(module, moduleIndex);

    const [isAddingLesson, setIsAddingLesson] = useState(false);

    // The module title swaps for an inline input while renaming —
    // the drag grip goes quiet so text selection never starts a
    // drag.
    const [isRenamingModule, setIsRenamingModule] = useState(false);

    // The lesson bar whose title is being renamed inline.
    const [renamingLessonId, setRenamingLessonId] = useState(null);

    // The lesson pending a delete confirmation — its bar stays
    // rendered until the dialog is confirmed.
    const [lessonToDelete, setLessonToDelete] = useState(null);
    const [isDeletingLesson, setIsDeletingLesson] = useState(false);

    // Add creates the lesson server-side — a partial reload of the
    // course prop lands the new bar in this module. The header
    // button expands the module so the new bar is visible.
    const handleAddLesson = () => {
        if (isAddingLesson) {
            return;
        }

        onEnsureExpanded?.(value);

        router.post(
            `/dashboard/modules/${module.id}/lessons`,
            {},
            {
                only: ['course'],
                onStart: () => setIsAddingLesson(true),
                onFinish: () => setIsAddingLesson(false),
            },
        );
    };

    // A lesson drag reorders the bars optimistically, then the
    // module-scoped reorder endpoint rewrites the stored
    // order_index — the partial reload confirms it.
    const handleLessonDragEnd = ({ active, over }) => {
        const nextLessons = resolveDragOrder(
            orderedLessons,
            active.id,
            over?.id,
        );

        if (!nextLessons) {
            return;
        }

        setOrderedLessons(nextLessons);

        router.put(
            `/dashboard/modules/${module.id}/lessons/reorder`,
            { lesson_order: nextLessons.map((lesson) => lesson.id) },
            {
                only: ['course'],
                onError: () => setOrderedLessons(lessons),
            },
        );
    };

    // A lesson rename settles optimistically in the bar mirror,
    // then the rename endpoint persists it — the partial reload
    // lands the authoritative title.
    const handleRenameLesson = (lesson, nextTitle) => {
        setOrderedLessons((prev) => renameItem(prev, lesson.id, nextTitle));

        router.put(
            `/dashboard/lessons/${lesson.id}`,
            { title: nextTitle },
            {
                only: ['course'],
                onError: () => setOrderedLessons(lessons),
            },
        );
    };

    // Confirm deletes the lesson server-side — its questions and
    // answers cascade via the foreign keys, and the partial reload
    // drops the bar.
    const handleConfirmDeleteLesson = () => {
        router.delete(`/dashboard/lessons/${lessonToDelete?.id}`, {
            only: ['course'],
            onStart: () => setIsDeletingLesson(true),
            onFinish: () => setIsDeletingLesson(false),
            onSuccess: () => setLessonToDelete(null),
        });
    };

    return (
        <CollapsibleSection
            value={value}
            dragId={module.id}
            dragDisabled={isRenamingModule}
            header={
                isRenamingModule ? (
                    <InlineTitleInput
                        initialTitle={module.title ?? ''}
                        onCommit={(nextTitle) => {
                            setIsRenamingModule(false);
                            onRenameModule?.(module, nextTitle);
                        }}
                        onCancel={() => setIsRenamingModule(false)}
                        className="max-w-xs"
                    />
                ) : (
                    <span
                        onClick={() => setIsRenamingModule(true)}
                        className="font-inter text-body-sm hover:text-primary-700 cursor-pointer truncate font-bold text-neutral-950 transition-colors select-none"
                        title="Rename module"
                    >
                        Module {moduleIndex + 1}: {module.title}
                    </span>
                )
            }
            actions={
                <>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddLesson();
                        }}
                        disabled={isAddingLesson}
                        className="hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-lg border border-neutral-950/5 bg-white p-1.5 text-neutral-500 transition-colors disabled:pointer-events-none disabled:opacity-50"
                        title="Add Item"
                    >
                        <Plus className="size-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRequestDeleteModule();
                        }}
                        className="hover:bg-error-50 hover:text-error-500 cursor-pointer rounded-lg border border-neutral-950/5 bg-white p-1.5 text-neutral-500 transition-colors"
                        title="Delete Module"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                </>
            }
        >
            {orderedLessons.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleLessonDragEnd}
                >
                    <SortableContext
                        items={orderedLessons.map((lesson) => lesson.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {orderedLessons.map((lesson, lessonIndex) => (
                                <DraggableItemBar
                                    key={lessonKey(lesson, lessonIndex)}
                                    item={{
                                        id: lessonKey(lesson, lessonIndex),
                                        title: lesson.title ?? '',
                                        type: lesson.type,
                                    }}
                                    indexText={`${moduleIndex + 1}.${lessonIndex + 1}`}
                                    isEditing={renamingLessonId === lesson.id}
                                    editInput={
                                        <InlineTitleInput
                                            initialTitle={lesson.title ?? ''}
                                            onCommit={(nextTitle) => {
                                                setRenamingLessonId(null);
                                                handleRenameLesson(
                                                    lesson,
                                                    nextTitle,
                                                );
                                            }}
                                            onCancel={() =>
                                                setRenamingLessonId(null)
                                            }
                                        />
                                    }
                                    onTitleClick={() =>
                                        setRenamingLessonId(lesson.id)
                                    }
                                    onDelete={() => setLessonToDelete(lesson)}
                                    editHref={`/dashboard/courses/${courseId}/lessons/${lesson.id}/edit`}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="rounded-xl border border-dashed border-neutral-950/10 bg-neutral-50/20 py-6 text-center">
                    <p className="font-inter text-body-sm text-neutral-500">
                        No items inside this module yet.
                    </p>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddLesson();
                        }}
                        disabled={isAddingLesson}
                        className="font-inter text-caption text-primary-700 mt-1 cursor-pointer font-bold hover:underline disabled:pointer-events-none disabled:opacity-50"
                    >
                        Add your first content item
                    </button>
                </div>
            )}

            <DeleteConfirmationDialog
                open={Boolean(lessonToDelete)}
                onOpenChange={(open) => !open && setLessonToDelete(null)}
                title="Delete Lesson"
                description={lessonDeleteDialogDescription(lessonToDelete)}
                confirmLabel="Delete Lesson"
                onConfirm={handleConfirmDeleteLesson}
                isSubmitting={isDeletingLesson}
            />
        </CollapsibleSection>
    );
}
