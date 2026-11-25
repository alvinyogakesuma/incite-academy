/**
 * Course editor outline-pipeline tests.
 *
 * Covers every decision in courseOutline.js:
 *
 *  resolveDragOrder
 *   D1  no drop target            → null (no-op)
 *   D2  dropped onto itself       → null
 *   D3  unknown active id         → null
 *   D4  unknown target id         → null
 *   D5  a valid drag              → the moved order (forward and
 *                                   backward moves)
 *
 *  renameItem
 *   D6  the renamed row patches in place; other rows untouched;
 *       an unknown id changes nothing
 *
 *  expandedIdsWith
 *   D7  a new value appends; an already-open value is a no-op
 *
 *  newlyAddedModuleValue
 *   D8  growth → the last module's value; no growth → null;
 *       a shrink → null
 *
 *  initialOpenModuleIds
 *   D9  the first module starts expanded; an empty outline starts
 *       fully collapsed
 *
 *  deleteDialogDescription
 *   D10  a module with lessons warns about them; without lessons
 *       it warns about the module alone; a null module stays safe
 *
 *  moduleValue / lessonKey
 *   D11  a stored id is used as-is; a draft row without an id
 *        falls back to its position
 *
 *  lessonDeleteDialogDescription
 *   D12  a lesson warns about its question tree; a null lesson
 *        stays safe
 */
import { describe, it, expect } from 'vitest';
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
} from '../courseOutline';

const MODULES = [
    { id: 11, title: 'Reading Fundamentals' },
    { id: 22, title: 'Listening Practice' },
    { id: 33, title: 'Structure Workshop' },
];

describe('resolveDragOrder', () => {
    it('D1 — a drop without a target is a no-op', () => {
        expect(resolveDragOrder(MODULES, 11, undefined)).toBeNull();
    });

    it('D2 — dropping a row onto itself is a no-op', () => {
        expect(resolveDragOrder(MODULES, 22, 22)).toBeNull();
    });

    it('D3 — an active id that does not exist is a no-op', () => {
        expect(resolveDragOrder(MODULES, 99, 22)).toBeNull();
    });

    it('D4 — a target id that does not exist is a no-op', () => {
        expect(resolveDragOrder(MODULES, 11, 99)).toBeNull();
    });

    it('D5 — a forward drag moves the row later in the order', () => {
        const next = resolveDragOrder(MODULES, 11, 33);

        expect(next.map((module) => module.id)).toEqual([22, 33, 11]);
    });

    it('D5 — a backward drag moves the row earlier in the order', () => {
        const next = resolveDragOrder(MODULES, 33, 22);

        expect(next.map((module) => module.id)).toEqual([11, 33, 22]);
    });
});

describe('renameItem', () => {
    it('D6 — the renamed row patches in place and others are untouched', () => {
        const next = renameItem(MODULES, 22, 'Listening Lab');

        expect(next[1]).toEqual({ id: 22, title: 'Listening Lab' });
        expect(next[0]).toBe(MODULES[0]);
        expect(next[2]).toBe(MODULES[2]);
    });

    it('D6 — an unknown id changes nothing', () => {
        expect(renameItem(MODULES, 99, 'New Title')).toEqual(MODULES);
    });
});

describe('expandedIdsWith', () => {
    it('D7 — a new value appends to the open list', () => {
        expect(expandedIdsWith(['11'], '22')).toEqual(['11', '22']);
    });

    it('D7 — an already-open value is a no-op', () => {
        expect(expandedIdsWith(['11', '22'], '11')).toEqual(['11', '22']);
    });
});

describe('newlyAddedModuleValue', () => {
    it('D8 — growth resolves to the last module’s value', () => {
        const grown = [...MODULES, { id: 44, title: 'Mock Tests' }];

        expect(newlyAddedModuleValue(grown, MODULES.length)).toBe('44');
    });

    it('D8 — no growth resolves to null', () => {
        expect(newlyAddedModuleValue(MODULES, MODULES.length)).toBeNull();
    });

    it('D8 — a shrink resolves to null', () => {
        expect(
            newlyAddedModuleValue(MODULES.slice(0, 2), MODULES.length),
        ).toBeNull();
    });
});

describe('initialOpenModuleIds', () => {
    it('D9 — the first module starts expanded', () => {
        expect(initialOpenModuleIds(MODULES)).toEqual(['11']);
    });

    it('D9 — an empty outline starts fully collapsed', () => {
        expect(initialOpenModuleIds([])).toEqual([]);
    });
});

describe('deleteDialogDescription', () => {
    it('D10 — a module with lessons warns about them too', () => {
        expect(
            deleteDialogDescription({
                title: 'Reading Fundamentals',
                lessons: [{}, {}, {}],
            }),
        ).toBe(
            'Are you sure you want to delete "Reading Fundamentals" and its 3 lesson(s)? This action cannot be undone.',
        );
    });

    it('D10 — a module without lessons warns about the module alone', () => {
        expect(deleteDialogDescription({ title: 'Listening Practice' })).toBe(
            'Are you sure you want to delete "Listening Practice"?',
        );
    });

    it('D10 — a null module stays safe', () => {
        expect(deleteDialogDescription(null)).toBe(
            'Are you sure you want to delete "undefined"?',
        );
    });
});

describe('moduleValue / lessonKey', () => {
    it('D11 — a stored module id is stringified as the accordion value', () => {
        expect(moduleValue({ id: 22 }, 1)).toBe('22');
    });

    it('D11 — a draft module without an id falls back to its position', () => {
        expect(moduleValue({}, 1)).toBe('module-1');
    });

    it('D11 — a stored lesson id is its drag id', () => {
        expect(lessonKey({ id: 5 }, 0)).toBe(5);
    });

    it('D11 — a draft lesson without an id falls back to its position', () => {
        expect(lessonKey({}, 2)).toBe('lesson-2');
    });
});

describe('lessonDeleteDialogDescription', () => {
    it('D12 — a lesson warns about the question tree going with it', () => {
        expect(
            lessonDeleteDialogDescription({ title: 'Listening Basics' }),
        ).toBe(
            'Are you sure you want to delete lesson "Listening Basics"? Its questions and answers go with it. This action cannot be undone.',
        );
    });

    it('D12 — a null lesson stays safe', () => {
        expect(lessonDeleteDialogDescription(null)).toBe(
            'Are you sure you want to delete this lesson? This action cannot be undone.',
        );
    });
});
