/**
 * Course editor — module/lesson outline pipeline.
 *
 * The outline components keep the dnd-kit integration and the router
 * dispatch; these helpers own the reorder, rename, and expansion
 * decisions so every outcome is unit testable:
 *
 *  - resolveDragOrder        a drag's decision triple: a no-op drop
 *                           (no target, or the row dropped onto
 *                           itself) and unknown ids resolve to null,
 *                           anything else resolves to the moved order.
 *  - renameItem             the optimistic title patch — only the
 *                           renamed row is replaced.
 *  - expandedIdsWith        idempotent accordion expansion.
 *  - newlyAddedModuleValue  growth detection — the accordion value of
 *                           the last module when the list grew, else
 *                           null, so a freshly added module opens
 *                           expanded.
 *  - initialOpenModuleIds   the first module starts expanded so a
 *                           populated outline is never a wall of
 *                           collapsed headers.
 *  - deleteDialogDescription  the confirmation copy switches on the
 *                           module's lesson count.
 *  - lessonDeleteDialogDescription  the lesson bar's confirmation
 *                           copy, warning about its question tree.
 *  - moduleValue / lessonKey  the accordion and drag ids, with
 *                           positional fallbacks for draft rows
 *                           without ids.
 */
import { arrayMove } from '@dnd-kit/sortable';

export const moduleValue = (module, moduleIndex) =>
    String(module.id ?? `module-${moduleIndex}`);

export const lessonKey = (lesson, lessonIndex) =>
    lesson.id ?? `lesson-${lessonIndex}`;

/**
 * Resolve a drag into the next order, or null when nothing should
 * happen: dropping outside any row, dropping a row onto itself, or
 * ids that do not exist in the list are all no-ops.
 */
export const resolveDragOrder = (items, activeId, overId) => {
    if (!overId || activeId === overId) {
        return null;
    }

    const oldIndex = items.findIndex((item) => item.id === activeId);
    const newIndex = items.findIndex((item) => item.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
        return null;
    }

    return arrayMove(items, oldIndex, newIndex);
};

/**
 * The optimistic rename patch — the renamed row's title swaps in
 * place, every other row is untouched.
 */
export const renameItem = (items, id, nextTitle) =>
    items.map((item) =>
        item.id === id ? { ...item, title: nextTitle } : item,
    );

/**
 * Append the accordion value only when it is not already open.
 */
export const expandedIdsWith = (prev, value) =>
    prev.includes(value) ? prev : [...prev, value];

/**
 * The accordion value of the module a partial reload just added —
 * the server visit swaps the course prop without remounting the
 * outline, so growth is detected by comparing counts.
 */
export const newlyAddedModuleValue = (orderedModules, prevCount) => {
    if (orderedModules.length > prevCount) {
        return moduleValue(
            orderedModules[orderedModules.length - 1],
            orderedModules.length - 1,
        );
    }

    return null;
};

/**
 * The accordion starts with its first module expanded.
 */
export const initialOpenModuleIds = (modules) =>
    modules[0] ? [moduleValue(modules[0], 0)] : [];

/**
 * The delete dialog's copy — a module with lessons warns about them.
 */
export const deleteDialogDescription = (module) =>
    module?.lessons?.length
        ? `Are you sure you want to delete "${module.title}" and its ${module.lessons.length} lesson(s)? This action cannot be undone.`
        : `Are you sure you want to delete "${module?.title}"?`;

/**
 * The lesson bar's delete dialog copy — the cascade is called out so
 * the admin knows the question tree goes with the lesson.
 */
export const lessonDeleteDialogDescription = (lesson) =>
    lesson
        ? `Are you sure you want to delete lesson "${lesson.title}"? Its questions and answers go with it. This action cannot be undone.`
        : 'Are you sure you want to delete this lesson? This action cannot be undone.';
