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
import { Plus } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import WysiwygEditor from '@/components/WysiwygEditor';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import Button from '@/components/Button';
import countWords from '@/utils/countWords';
import QuestionCard from './QuestionCard';
import {
    blankQuestionRow,
    newlyAddedQuestionId,
    questionDeleteDescription,
    questionMovePair,
} from './questionTree';

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
 * Lesson editor right panel — the content variant follows the
 * lesson's type. Articles bind the WYSIWYG body to the form's
 * article_content; quizzes and exams render the question cards as
 * a field array, each card owning a nested answers array. The
 * whole tree persists with the lesson save.
 */
export default function LessonContent({ control, errors = {}, setValue }) {
    const type = useWatch({ control, name: 'type' }) ?? 'article';

    return type === 'article' ? (
        <ArticleContent control={control} errors={errors} />
    ) : (
        <QuestionOutline
            control={control}
            errors={errors}
            setValue={setValue}
        />
    );
}

/**
 * Article variant — the WYSIWYG body bound to the form's
 * article_content with its live word count caption.
 */
function ArticleContent({ control, errors }) {
    const content = useWatch({ control, name: 'article_content' }) ?? '';

    return (
        <>
            <SectionHeading
                title="Article Content"
                action={
                    <span className="font-inter text-body-sm font-semibold text-neutral-500">
                        Content *
                    </span>
                }
            />

            <Controller
                name="article_content"
                control={control}
                render={({ field }) => (
                    <WysiwygEditor
                        value={field.value ?? ''}
                        onChange={(html) => field.onChange(html)}
                        placeholder="Start typing the lesson content..."
                        variant="full"
                    />
                )}
            />

            {errors.article_content?.message && (
                <p className="font-inter text-caption text-error-500 mt-2 px-1">
                    {errors.article_content.message}
                </p>
            )}

            <p className="font-inter text-body-sm mt-2 px-1 text-neutral-500">
                {countWords(content)} words
            </p>
        </>
    );
}

/**
 * Quiz/exam variant — one collapsible card per row of the form's
 * questions field array. Add Question appends a blank row and
 * opens its card; delete confirms, then drops the row.
 */
function QuestionOutline({ control, errors, setValue }) {
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
        append(blankQuestionRow());
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
                title="Exercise Questions"
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
                        to start building your exercise.
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
                description={questionDeleteDescription(questionToDelete)}
                confirmLabel="Delete Question"
                onConfirm={() => {
                    remove(questionToDelete);
                    setQuestionToDelete(null);
                }}
            />
        </>
    );
}
