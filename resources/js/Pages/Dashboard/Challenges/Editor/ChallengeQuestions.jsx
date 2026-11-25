import { useEffect, useRef, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
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
import { Plus } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import Button from '@/components/Button';
import QuestionCard from './QuestionCard';
import {
    blankQuestionRow,
    newlyAddedQuestionId,
    questionDeleteDescription,
    questionMovePair,
} from '@/Pages/Dashboard/Lesson/Editor/questionTree';

// Drag activation demands a small movement so clicks (accordion
// toggles, radios, buttons) never start drags; the keyboard sensor
// keeps the grips accessible.
const useOutlineSensors = () =>
    useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

/**
 * Challenge editor right panel — the question cards as a field
 * array, each card owning a nested answers array. The whole tree
 * persists with the challenge save. The lesson editor's question
 * outline, without the branch dispatch — a challenge always shows
 * its questions.
 */
export default function ChallengeQuestions({ control, errors = {}, setValue }) {
    const sensors = useOutlineSensors();

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'questions',
    });

    // Cards start collapsed — the body stays tidy until the admin
    // opens it.
    const [openQuestionIds, setOpenQuestionIds] = useState([]);

    // The question pending a delete confirmation — its card stays
    // rendered until the dialog is confirmed.
    const [questionToDelete, setQuestionToDelete] = useState(null);

    // A freshly appended question opens expanded — the field
    // array's row ids are stable, so growth is detected by
    // comparing counts.
    const prevQuestionCountRef = useRef(fields.length);
    useEffect(() => {
        const addedId = newlyAddedQuestionId(
            fields,
            prevQuestionCountRef.current,
        );

        if (addedId) {
            setOpenQuestionIds((prev) => [...prev, addedId]);
        }

        prevQuestionCountRef.current = fields.length;
    }, [fields]);

    const handleAddQuestion = () => {
        append(blankQuestionRow({ withAudioDuration: false }));
    };

    // A drag reorders the field array in place — the new order
    // rides the whole-payload save, where the server sync rewrites
    // order_index from the payload positions.
    const handleQuestionDragEnd = ({ active, over }) => {
        const movePair = questionMovePair(fields, active.id, over?.id);

        if (!movePair) {
            return;
        }

        move(movePair.oldIndex, movePair.newIndex);
    };

    return (
        <>
            <SectionHeading
                title="Challenge Questions"
                action={
                    <Button onClick={handleAddQuestion}>
                        <Plus className="size-4 shrink-0" />
                        Add Question
                    </Button>
                }
            />

            {fields.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-950/10 bg-neutral-50/50 p-8 text-center">
                    <p className="font-inter text-body-sm text-neutral-500">
                        No questions added yet. Click &quot;+ Add Question&quot;
                        to start building your challenge.
                    </p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleQuestionDragEnd}
                >
                    <SortableContext
                        items={fields.map((field) => field.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <Accordion.Root
                            type="multiple"
                            value={openQuestionIds}
                            onValueChange={setOpenQuestionIds}
                            className="space-y-4"
                        >
                            {fields.map((field, questionIndex) => (
                                <QuestionCard
                                    key={field.id}
                                    fieldId={field.id}
                                    control={control}
                                    errors={errors}
                                    setValue={setValue}
                                    questionIndex={questionIndex}
                                    onRequestDelete={() =>
                                        setQuestionToDelete(questionIndex)
                                    }
                                />
                            ))}
                        </Accordion.Root>
                    </SortableContext>
                </DndContext>
            )}

            <DeleteConfirmationDialog
                open={questionToDelete !== null}
                onOpenChange={(open) => !open && setQuestionToDelete(null)}
                title="Delete Question"
                description={questionDeleteDescription(
                    questionToDelete,
                    'challenge',
                )}
                confirmLabel="Delete Question"
                onConfirm={() => {
                    remove(questionToDelete);
                    setQuestionToDelete(null);
                }}
            />
        </>
    );
}
