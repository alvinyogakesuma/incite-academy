import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
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
import SectionHeading from './SectionHeading';
import CollapsibleSection from './CollapsibleSection';
import SelectField from './SelectField';
import TextField from './TextField';
import Button from './Button';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import {
    blankConditionRow,
    conditionDeleteDescription,
    conditionSummary,
    entityOptionsFor,
    entitySelectOptions,
    isNumericType,
    operatorAfterTypeSwitch,
} from './conditionsLogic';
import {
    newlyAddedQuestionId,
    questionMovePair,
} from '@/Pages/Dashboard/Lesson/Editor/questionTree';
import { LOGIC_OPTIONS } from '@/Pages/Dashboard/Badges/Editor/badgeSchema';

// The condition types — long labels for the dropdowns, short ones
// for the summary chips (the labels' single home is the covered
// conditions module).
const TYPE_OPTIONS = [
    { value: 'points', label: 'Total Points' },
    { value: 'quiz', label: 'Quiz Score' },
    { value: 'course', label: 'Course Completed' },
    { value: 'path', label: 'Learning Path Completed' },
    { value: 'challenge', label: 'Challenge Completed' },
];

const OPERATOR_OPTIONS = [
    { value: '>=', label: 'Greater than or equal (>=)' },
    { value: '<=', label: 'Less than or equal (<=)' },
    { value: '>', label: 'Greater than (>)' },
    { value: '<', label: 'Less than (<)' },
    { value: '=', label: 'Equal (=)' },
];

// Drag activation demands a small movement so clicks (selects,
// buttons, accordion toggles) never start drags; the keyboard
// sensor keeps the grips accessible.
const useConditionSensors = () =>
    useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

/**
 * One earning condition row — the type, the operator (locked to
 * equality for entity types), and the contextual value: a numeric
 * threshold for points and quiz scores, an entity pick for
 * courses, paths, and challenges. The whole row rides in the
 * single save.
 */
function ConditionRow({
    control,
    errors = {},
    index,
    fieldId,
    setValue,
    availableCourses = [],
    availablePaths = [],
    availableChallenges = [],
    onRequestDelete,
}) {
    const condition = useWatch({
        control,
        name: `conditions.${index}`,
    });

    const type = condition?.type ?? 'points';
    const isNumeric = isNumericType(type);

    const rowErrors = errors.conditions?.[index] ?? {};

    const entityOptions = entityOptionsFor(type, {
        availableCourses,
        availablePaths,
        availableChallenges,
    });

    return (
        <CollapsibleSection
            value={String(fieldId)}
            dragId={fieldId}
            header={
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="font-poppins text-caption shrink-0 font-bold text-neutral-950">
                        Condition {index + 1}
                    </span>
                    {condition?.type && (
                        <span className="font-inter text-caption text-primary-700 border-primary-700/10 bg-primary-50 max-w-[150px] truncate rounded-lg border px-2.5 py-0.5 font-bold sm:max-w-[280px]">
                            {conditionSummary(condition)}
                        </span>
                    )}
                </div>
            }
            actions={
                <button
                    type="button"
                    onClick={onRequestDelete}
                    className="hover:bg-error-50 hover:text-error-500 cursor-pointer rounded-lg p-1 text-neutral-500 transition-colors"
                    title="Delete Condition"
                >
                    <Trash2 className="size-3.5" />
                </button>
            }
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Condition Type — a type switch resets the
                    operator and value so the row never carries a
                    mismatched pair */}
                <Controller
                    name={`conditions.${index}.type`}
                    control={control}
                    render={({ field }) => (
                        <SelectField
                            name={field.name}
                            label="Condition Type"
                            options={TYPE_OPTIONS}
                            value={field.value}
                            onValueChange={(value) => {
                                field.onChange(value);

                                // Numeric types compare through a
                                // threshold, entity types through a
                                // specific pick.
                                setValue(
                                    `conditions.${index}.operator`,
                                    operatorAfterTypeSwitch(value),
                                    { shouldDirty: true },
                                );
                                setValue(`conditions.${index}.value`, '', {
                                    shouldDirty: true,
                                });
                            }}
                            placeholder="Select type..."
                            errorMessage={rowErrors.type?.message}
                            required
                        />
                    )}
                />

                {/* Operator — the five comparators for numeric
                    types, locked equality for entity picks */}
                <Controller
                    name={`conditions.${index}.operator`}
                    control={control}
                    render={({ field }) =>
                        isNumeric ? (
                            <SelectField
                                name={field.name}
                                label="Operator"
                                options={OPERATOR_OPTIONS}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Select operator..."
                                errorMessage={rowErrors.operator?.message}
                                required
                            />
                        ) : (
                            <SelectField
                                name={field.name}
                                label="Operator"
                                options={[{ value: '=', label: 'Is (=)' }]}
                                value="="
                                onValueChange={() => {}}
                                required
                                className="pointer-events-none opacity-60"
                            />
                        )
                    }
                />

                {/* Contextual Value — the threshold or the entity
                    pick */}
                <Controller
                    name={`conditions.${index}.value`}
                    control={control}
                    render={({ field }) =>
                        isNumeric ? (
                            <TextField
                                name={field.name}
                                label={
                                    type === 'points'
                                        ? 'Points Threshold'
                                        : 'Quiz Score (%)'
                                }
                                type="number"
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                placeholder={
                                    type === 'points' ? 'e.g. 50' : 'e.g. 100'
                                }
                                errorMessage={rowErrors.value?.message}
                                required
                            />
                        ) : (
                            <SelectField
                                name={field.name}
                                label={
                                    type === 'course'
                                        ? 'Select Course'
                                        : type === 'path'
                                          ? 'Select Learning Path'
                                          : 'Select Challenge'
                                }
                                options={entitySelectOptions(
                                    entityOptions,
                                    field.value,
                                )}
                                value={field.value ?? ''}
                                onValueChange={field.onChange}
                                placeholder={
                                    type === 'course'
                                        ? 'Choose course...'
                                        : type === 'path'
                                          ? 'Choose learning path...'
                                          : 'Choose challenge...'
                                }
                                errorMessage={rowErrors.value?.message}
                                required
                            />
                        )
                    }
                />
            </div>
        </CollapsibleSection>
    );
}

/**
 * The earning requirements builder — shared by every
 * requirements-driven editor (badges, avatars): the logic row
 * deciding whether ALL or ANY conditions must be met, condition
 * rows whose order rides the whole-payload save, and the delete
 * confirmation before a row drops. The owning page supplies its
 * own panel heading. Ported from the deprecated app's conditions
 * builders onto @dnd-kit and the current design tokens.
 */
export default function ConditionsBuilder({
    control,
    errors = {},
    setValue,
    heading,
    availableCourses = [],
    availablePaths = [],
    availableChallenges = [],
}) {
    const sensors = useConditionSensors();

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'conditions',
    });

    // Rows start collapsed — the body stays tidy until the admin
    // opens it.
    const [openConditionIds, setOpenConditionIds] = useState([]);

    // The condition pending a delete confirmation — its row stays
    // rendered until the dialog is confirmed.
    const [conditionToDelete, setConditionToDelete] = useState(null);

    // A freshly appended condition opens expanded — the field
    // array's row ids are stable, so growth is detected by
    // comparing counts.
    const prevCountRef = useRef(fields.length);
    useEffect(() => {
        const addedId = newlyAddedQuestionId(fields, prevCountRef.current);

        if (addedId) {
            setOpenConditionIds((prev) => [...prev, addedId]);
        }

        prevCountRef.current = fields.length;
    }, [fields]);

    const handleAddCondition = () => {
        append(blankConditionRow());
    };

    // A drag reorders the field array in place — the new order
    // rides the whole-payload save.
    const handleDragEnd = ({ active, over }) => {
        const movePair = questionMovePair(fields, active.id, over?.id);

        if (!movePair) {
            return;
        }

        move(movePair.oldIndex, movePair.newIndex);
    };

    return (
        <>
            {/* Logic Builder Row */}
            <div className="rounded-2xl border border-neutral-950/5 bg-neutral-50/50 p-4">
                <Controller
                    name="logic"
                    control={control}
                    render={({ field }) => (
                        <SelectField
                            name={field.name}
                            label="Condition Logic"
                            options={LOGIC_OPTIONS}
                            value={field.value}
                            onValueChange={field.onChange}
                            errorMessage={errors.logic?.message}
                            required
                        />
                    )}
                />
            </div>

            <SectionHeading
                title={heading}
                action={
                    <Button onClick={handleAddCondition}>
                        <Plus className="size-4 shrink-0" />
                        Add Condition
                    </Button>
                }
            />

            {fields.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-950/10 bg-neutral-50/50 p-8 text-center">
                    <p className="font-inter text-body-sm text-neutral-500">
                        No conditions added yet. Click &quot;+ Add
                        Condition&quot; to start building achievement rules.
                    </p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={fields.map((field) => field.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <Accordion.Root
                            type="multiple"
                            value={openConditionIds}
                            onValueChange={setOpenConditionIds}
                            className="space-y-4"
                        >
                            {fields.map((field, index) => (
                                <ConditionRow
                                    key={field.id}
                                    fieldId={field.id}
                                    control={control}
                                    errors={errors}
                                    index={index}
                                    setValue={setValue}
                                    availableCourses={availableCourses}
                                    availablePaths={availablePaths}
                                    availableChallenges={availableChallenges}
                                    onRequestDelete={() =>
                                        setConditionToDelete(index)
                                    }
                                />
                            ))}
                        </Accordion.Root>
                    </SortableContext>
                </DndContext>
            )}

            {errors.conditions?.message && (
                <p className="font-inter text-caption text-error-500">
                    {errors.conditions.message}
                </p>
            )}

            <DeleteConfirmationDialog
                open={conditionToDelete !== null}
                onOpenChange={(open) => !open && setConditionToDelete(null)}
                title="Delete Condition"
                description={conditionDeleteDescription(conditionToDelete)}
                confirmLabel="Delete Condition"
                onConfirm={() => {
                    remove(conditionToDelete);
                    setConditionToDelete(null);
                }}
            />
        </>
    );
}
