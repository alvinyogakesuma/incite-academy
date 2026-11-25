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
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Button from '@/components/Button';
import SelectField from '@/components/SelectField';
import { formatDuration } from '@/Pages/Dashboard/Courses/courseTable';
import { questionMovePair } from '@/Pages/Dashboard/Lesson/Editor/questionTree';

// Drag activation demands a small movement so clicks (selects,
// buttons) never start drags; the keyboard sensor keeps the
// grips accessible.
const useSequenceSensors = () =>
    useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

/**
 * One course slot of the sequence — the id-keyed course select on
 * the shared SelectField ({ value, label } options, the id string
 * as the value), the picked course's chips, and the drag grip and
 * remove actions.
 */
function CourseSlotRow({
    control,
    errors = {},
    index,
    fieldId,
    availableCourses,
    onRemove,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: fieldId });

    const selectedCourseId = useWatch({
        control,
        name: `courses.${index}.course_id`,
    });

    const selectedCourse = availableCourses.find(
        (course) => course.id === selectedCourseId,
    );

    const rowError = errors.courses?.[index]?.course_id?.message;

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={`group/item flex items-start gap-4 rounded-2xl border border-neutral-950/5 bg-white p-4 transition-all hover:border-neutral-950/10 hover:bg-neutral-50/40 ${
                isDragging
                    ? 'border-primary-700 bg-primary-50 z-10 opacity-40 shadow-lg'
                    : ''
            }`}
        >
            {/* Drag handle */}
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="mt-3.5 shrink-0 cursor-grab text-neutral-950/30 transition-colors outline-none group-hover/item:text-neutral-950/60"
                title="Reorder course"
            >
                <GripVertical className="size-4" />
            </button>

            {/* Index badge */}
            <div className="border-primary-700/5 bg-primary-50 text-primary-700 font-inter text-caption mt-1.5 shrink-0 rounded-xl border px-2.5 py-1.5 font-bold">
                {index + 1}
            </div>

            {/* The course select + chips */}
            <div className="flex-1 space-y-2">
                <Controller
                    name={`courses.${index}.course_id`}
                    control={control}
                    render={({ field }) => (
                        <SelectField
                            inForm={false}
                            name={`course-slot-${fieldId}`}
                            options={availableCourses.map((course) => ({
                                value: String(course.id),
                                label: course.title,
                            }))}
                            value={
                                field.value != null ? String(field.value) : ''
                            }
                            onValueChange={(value) =>
                                field.onChange(Number(value))
                            }
                            placeholder="Select a course..."
                            errorMessage={rowError}
                        />
                    )}
                />

                {rowError && (
                    <p className="font-inter text-caption text-error-500">
                        {rowError}
                    </p>
                )}

                {selectedCourse && (
                    <div className="flex gap-2">
                        <span className="font-inter text-caption rounded-full border border-neutral-950/5 bg-neutral-50 px-2.5 py-1 font-medium text-neutral-500">
                            {formatDuration(selectedCourse.duration)}
                        </span>
                        <span className="font-inter text-caption rounded-full border border-neutral-950/5 bg-neutral-50 px-2.5 py-1 font-medium text-neutral-500">
                            {selectedCourse.modules} Modules
                        </span>
                    </div>
                )}
            </div>

            {/* Remove */}
            <button
                type="button"
                onClick={onRemove}
                className="hover:bg-error-50 hover:text-error-500 mt-1 cursor-pointer rounded-xl border border-neutral-950/5 bg-white p-2 text-neutral-500 transition-all"
                title="Remove from Sequence"
            >
                <Trash2 className="size-4" />
            </button>
        </div>
    );
}

/**
 * Learning path editor right panel — the course sequence as a
 * field array: each slot picks one course, the drag grips
 * reorder the sequence, and the payload order becomes the pivot's
 * order_index on the whole-payload save. Ported from the
 * deprecated app's sequence builder onto @dnd-kit and the
 * current design tokens.
 */
export default function CourseSequence({
    control,
    errors = {},
    availableCourses = [],
}) {
    const sensors = useSequenceSensors();

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'courses',
    });

    const handleAddCourseSlot = () => {
        append({ course_id: null });
    };

    // A drag reorders the field array in place — the new order
    // rides the whole-payload save, where the server sync maps
    // positions onto the pivot's order_index.
    const handleDragEnd = ({ active, over }) => {
        const movePair = questionMovePair(fields, active.id, over?.id);

        if (!movePair) {
            return;
        }

        move(movePair.oldIndex, movePair.newIndex);
    };

    return (
        <>
            <SectionHeading
                title="Course Sequence"
                action={
                    <Button onClick={handleAddCourseSlot}>
                        <Plus className="size-4 shrink-0" />
                        Add Course
                    </Button>
                }
            />

            {fields.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-950/10 bg-neutral-50/50 p-16 text-center">
                    <p className="font-inter text-body-sm text-neutral-500">
                        No courses added to the sequence.
                    </p>
                    <button
                        type="button"
                        onClick={handleAddCourseSlot}
                        className="text-caption text-primary-700 mt-2 cursor-pointer font-bold hover:underline"
                    >
                        Add your first course slot
                    </button>
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
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <CourseSlotRow
                                    key={field.id}
                                    fieldId={field.id}
                                    control={control}
                                    errors={errors}
                                    index={index}
                                    availableCourses={availableCourses}
                                    onRemove={() => remove(index)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {errors.courses?.message && (
                <p className="font-inter text-caption text-error-500">
                    {errors.courses.message}
                </p>
            )}
        </>
    );
}
