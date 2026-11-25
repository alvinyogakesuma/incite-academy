/**
 * Conditions builder tests.
 *
 * Covers the shared ConditionsBuilder component's row decisions —
 * the module both editors (badges, avatars) import:
 *
 *  conditionTypeLabel
 *   D1  the five humanized labels; an unknown type passes through
 *
 *  isNumericType / operatorAfterTypeSwitch
 *   D2  points and quiz are numeric; the entity picks are not
 *   D3  the type switch's pair reset — numeric starts '>=',
 *       entities start '='
 *
 *  conditionSummary
 *   D4  an untyped row reads the placeholder
 *   D5  a typed row reads its glance — the type label, the
 *       operator, the value; the null-safe fallbacks fill gaps
 *
 *  entityOptionsFor / entitySelectOptions
 *   D6  the entity chain — courses, paths, challenges
 *   D7  the empty-catalog fallback still offers the stored value
 *
 *  blankConditionRow / conditionDeleteDescription
 *   D8  the Add factory saves as-is
 *   D9  the delete copy names the condition's position; null
 *       renders no copy
 *
 *  Reuse pins (the shared field-array helpers)
 *   D10 the drag triple resolves on condition rows
 *   D11 the growth detection resolves on condition rows
 */
import { describe, it, expect } from 'vitest';
import {
    blankConditionRow,
    conditionDeleteDescription,
    conditionSummary,
    conditionTypeLabel,
    entityOptionsFor,
    entitySelectOptions,
    isNumericType,
    operatorAfterTypeSwitch,
} from '@/components/conditionsLogic';
import {
    newlyAddedQuestionId,
    questionMovePair,
} from '@/Pages/Dashboard/Lesson/Editor/questionTree';

describe('conditionTypeLabel', () => {
    it('D1 — the five humanized labels; an unknown type yields undefined', () => {
        expect(conditionTypeLabel('points')).toBe('Points');
        expect(conditionTypeLabel('course')).toBe('Course');
        // The raw lookup carries no passthrough — the summary owns
        // it.
        expect(conditionTypeLabel('lessons')).toBeUndefined();
    });
});

describe('isNumericType / operatorAfterTypeSwitch', () => {
    it('D2 — points and quiz are numeric; the entity picks are not', () => {
        expect(isNumericType('points')).toBe(true);
        expect(isNumericType('quiz')).toBe(true);
        expect(isNumericType('course')).toBe(false);
        expect(isNumericType('path')).toBe(false);
        expect(isNumericType('challenge')).toBe(false);
    });

    it('D3 — the type switch resets the pair: numeric starts >=, entities start =', () => {
        expect(operatorAfterTypeSwitch('points')).toBe('>=');
        expect(operatorAfterTypeSwitch('quiz')).toBe('>=');
        expect(operatorAfterTypeSwitch('course')).toBe('=');
        expect(operatorAfterTypeSwitch('challenge')).toBe('=');
    });
});

describe('conditionSummary', () => {
    it('D4 — an untyped row reads the placeholder', () => {
        expect(conditionSummary(null)).toBe('New Condition');
        expect(conditionSummary({})).toBe('New Condition');
    });

    it('D5 — a typed row reads its glance with null-safe fallbacks', () => {
        expect(
            conditionSummary({ type: 'points', operator: '>=', value: '50' }),
        ).toBe('Points >= 50');
        // The operator and value fall back to the gap markers.
        expect(conditionSummary({ type: 'course' })).toBe('Course  ...');
        // An unknown type passes through — the summary owns the
        // passthrough, not the raw label lookup.
        expect(
            conditionSummary({ type: 'lessons', operator: '>=', value: '50' }),
        ).toBe('lessons >= 50');
    });
});

describe('entityOptionsFor / entitySelectOptions', () => {
    const AVAILABLE = {
        availableCourses: [
            { value: 'English Basics', label: 'English Basics' },
        ],
        availablePaths: [],
        availableChallenges: [
            { value: 'Dictation Duel', label: 'Dictation Duel' },
        ],
    };

    it('D6 — the entity chain serves each type its own options', () => {
        expect(entityOptionsFor('course', AVAILABLE)).toBe(
            AVAILABLE.availableCourses,
        );
        expect(entityOptionsFor('path', AVAILABLE)).toBe(
            AVAILABLE.availablePaths,
        );
        expect(entityOptionsFor('challenge', AVAILABLE)).toBe(
            AVAILABLE.availableChallenges,
        );
    });

    it('D7 — an empty catalog still offers the stored value', () => {
        // Live-capable: a picked entity whose catalog emptied
        // (a renamed or deleted course) keeps its pick visible.
        expect(entitySelectOptions([], 'English Basics')).toEqual([
            { value: 'English Basics', label: 'English Basics' },
        ]);
        // Nothing stored: the placeholder label.
        expect(entitySelectOptions([], null)).toEqual([
            { value: '', label: 'Nothing available yet...' },
        ]);
        expect(entitySelectOptions(AVAILABLE.availableCourses, 'x')).toBe(
            AVAILABLE.availableCourses,
        );
    });
});

describe('blankConditionRow / conditionDeleteDescription', () => {
    it('D8 — the Add factory saves as-is', () => {
        expect(blankConditionRow()).toEqual({
            type: 'points',
            operator: '>=',
            value: '',
        });
    });

    it('D9 — the delete copy names the condition\u2019s position; null renders no copy', () => {
        expect(conditionDeleteDescription(0)).toBe(
            'Are you sure you want to delete Condition 1? The item is saved with the condition removed.',
        );
        expect(conditionDeleteDescription(null)).toBe('');
    });
});

describe('reuse pins — the shared field-array helpers', () => {
    const ROWS = [
        { id: 'c1', type: 'points' },
        { id: 'c2', type: 'quiz' },
        { id: 'c3', type: 'course' },
    ];

    it('D10 — the drag triple resolves on condition rows', () => {
        expect(questionMovePair(ROWS, 'c1', 'c3')).toEqual({
            oldIndex: 0,
            newIndex: 2,
        });
        expect(questionMovePair(ROWS, 'c2', 'c2')).toBeNull();
    });

    it('D11 — the growth detection resolves on condition rows', () => {
        expect(newlyAddedQuestionId([...ROWS, { id: 'c4' }], ROWS.length)).toBe(
            'c4',
        );
        expect(newlyAddedQuestionId(ROWS, ROWS.length)).toBeNull();
    });
});
