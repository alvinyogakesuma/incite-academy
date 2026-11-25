import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import CollapsibleSection from '@/components/CollapsibleSection';
import SelectField from '@/components/SelectField';
import WysiwygEditor from '@/components/WysiwygEditor';
import AudioUploadInput from '@/components/AudioUploadInput';
import AnswerChoicesInput from '@/components/AnswerChoicesInput';
import {
    QUESTION_TYPES,
    MIN_ANSWER_CHOICES,
    MAX_ANSWER_CHOICES,
} from './challengeSchema';
import {
    audioFilenameFor,
    audioPreviewFor,
    correctChoiceRows,
    nextChoiceLabel,
    removalPatchFor,
} from '@/Pages/Dashboard/Lesson/Editor/questionTree';

/**
 * One question card of the challenge outline — the type select,
 * listening audio, the WYSIWYG question text, and the answer
 * choices, all wired to the owning form. The answers are their
 * own field array nested under this question's index, so the
 * whole card rides in the single challenge save. The lesson
 * editor's question card, without the audio-duration wiring —
 * challenge questions only carry the clip itself.
 */
export default function QuestionCard({
    control,
    errors = {},
    setValue,
    questionIndex,
    fieldId,
    onRequestDelete,
}) {
    const type =
        useWatch({ control, name: `questions.${questionIndex}.type` }) ??
        'text';
    const audio = useWatch({
        control,
        name: `questions.${questionIndex}.audio`,
    });
    const audioUrl = useWatch({
        control,
        name: `questions.${questionIndex}.audio_url`,
    });
    const removeAudio = useWatch({
        control,
        name: `questions.${questionIndex}.remove_audio`,
    });

    const {
        fields: answerFields,
        append,
        remove,
        update,
    } = useFieldArray({
        control,
        name: `questions.${questionIndex}.answers`,
    });

    // Fresh uploads preview through an object URL — created once
    // per file and revoked on swap or unmount.
    const [objectUrl, setObjectUrl] = useState(null);
    useEffect(() => {
        if (!(audio instanceof File)) {
            setObjectUrl(null);
            return undefined;
        }

        const url = URL.createObjectURL(audio);
        setObjectUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [audio]);

    // The stored-preview switch: removing the audio hides the
    // stored file instantly client-side, while the challenge prop
    // only refreshes after the server round-trip.
    const previewUrl = audioPreviewFor(audio, objectUrl, removeAudio, audioUrl);
    const previewFilename = audioFilenameFor(audio, audioUrl);

    return (
        <CollapsibleSection
            value={String(fieldId)}
            dragId={fieldId}
            header={
                <span className="font-poppins text-body-sm font-bold text-neutral-950">
                    Question {questionIndex + 1}
                    {type === 'listening' && (
                        <span className="font-inter text-caption text-primary-700 bg-primary-50 ml-2 rounded-full px-2 py-0.5 font-bold tracking-wider uppercase">
                            Listening
                        </span>
                    )}
                </span>
            }
            actions={
                <button
                    type="button"
                    onClick={onRequestDelete}
                    className="hover:bg-error-50 hover:text-error-500 cursor-pointer rounded-lg p-1 text-neutral-500 transition-colors"
                    title="Delete Question"
                >
                    <Trash2 className="size-3.5" />
                </button>
            }
        >
            <div className="flex flex-col gap-4">
                {/* Question Type */}
                <Controller
                    name={`questions.${questionIndex}.type`}
                    control={control}
                    render={({ field }) => (
                        <SelectField
                            name={field.name}
                            label="Question Type"
                            options={QUESTION_TYPES}
                            value={field.value}
                            onValueChange={field.onChange}
                            errorMessage={
                                errors.questions?.[questionIndex]?.type?.message
                            }
                            required
                        />
                    )}
                />

                {/* Audio (Listening Only) */}
                {type === 'listening' && (
                    <>
                        <AudioUploadInput
                            audioUrl={previewUrl}
                            audioFilename={previewFilename}
                            audioDuration={null}
                            onUpload={(file) => {
                                setValue(
                                    `questions.${questionIndex}.audio`,
                                    file,
                                    { shouldDirty: true },
                                );
                                // A fresh upload overrides a pending removal.
                                setValue(
                                    `questions.${questionIndex}.remove_audio`,
                                    false,
                                    { shouldDirty: true },
                                );
                            }}
                            onRemove={() => {
                                // The removal split: a fresh upload
                                // clears the audio field, a stored
                                // file flags remove_audio.
                                Object.entries(
                                    removalPatchFor(audio, {
                                        withAudioDuration: false,
                                    }),
                                ).forEach(([name, value]) => {
                                    setValue(
                                        `questions.${questionIndex}.${name}`,
                                        value,
                                        { shouldDirty: true },
                                    );
                                });
                            }}
                        />

                        {errors.questions?.[questionIndex]?.audio?.message && (
                            <p className="font-inter text-caption text-error-500">
                                {errors.questions[questionIndex].audio.message}
                            </p>
                        )}
                    </>
                )}

                {/* Question Text */}
                <div className="flex flex-col gap-1.5">
                    <label className="font-inter text-body-sm block font-bold text-neutral-700">
                        Question Text <span className="text-error-500">*</span>
                    </label>
                    <Controller
                        name={`questions.${questionIndex}.question_content`}
                        control={control}
                        render={({ field }) => (
                            <WysiwygEditor
                                value={field.value ?? ''}
                                onChange={(html) => field.onChange(html)}
                                placeholder="Enter your question here..."
                                variant="compact"
                            />
                        )}
                    />
                    {errors.questions?.[questionIndex]?.question_content
                        ?.message && (
                        <p className="font-inter text-caption text-error-500">
                            {
                                errors.questions[questionIndex].question_content
                                    .message
                            }
                        </p>
                    )}
                </div>

                {/* Answer Choices */}
                <AnswerChoicesInput
                    choices={answerFields.map((field) => ({
                        id: field.id,
                        answer_content: field.answer_content,
                        is_true: Boolean(field.is_correct),
                    }))}
                    onCorrectChoiceIndexChange={(choiceIndex) => {
                        // The radio owns every row's flag — exactly
                        // one correct answer. update() (never
                        // setValue) so the fields snapshot
                        // refreshes and the radios render checked.
                        // The challenge rows key their flag on
                        // is_correct.
                        correctChoiceRows(answerFields, choiceIndex, {
                            correctKey: 'is_correct',
                        }).forEach((row, index) => {
                            update(index, row);
                        });
                    }}
                    onAddChoice={() =>
                        // Seeded with its placeholder text at the
                        // next position — what you see is what
                        // saves. Never auto-correct: only the
                        // question-creation default is marked.
                        append({
                            stored_id: null,
                            answer_content: nextChoiceLabel(
                                answerFields.length,
                            ),
                            is_correct: false,
                        })
                    }
                    onRenameChoice={(choiceId, content) => {
                        const index = answerFields.findIndex(
                            (field) => field.id === choiceId,
                        );

                        if (index !== -1) {
                            update(index, {
                                stored_id:
                                    answerFields[index].stored_id ?? null,
                                answer_content: content,
                                is_correct: Boolean(
                                    answerFields[index].is_correct,
                                ),
                            });
                        }
                    }}
                    onDeleteChoice={(choiceId) => {
                        const index = answerFields.findIndex(
                            (field) => field.id === choiceId,
                        );

                        if (index !== -1) {
                            remove(index);
                        }
                    }}
                    minChoices={MIN_ANSWER_CHOICES}
                    maxChoices={MAX_ANSWER_CHOICES}
                    errorMessage={
                        errors.questions?.[questionIndex]?.answers?.message ??
                        ''
                    }
                />
            </div>
        </CollapsibleSection>
    );
}
