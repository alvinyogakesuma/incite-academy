import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * Controlled answer-choices editor. Renders the choice rows, the
 * correct-answer radio (checked on the row carrying `is_true`), and
 * the add/rename/delete affordances; every mutation is reported
 * upward through callbacks so the owning form decides what an edit
 * means (draft rows in a giant payload, or per-row persistence).
 */
export default function AnswerChoicesInput({
    choices = [],
    onCorrectChoiceIndexChange,
    onAddChoice,
    onRenameChoice,
    onDeleteChoice,
    maxChoices = 6,
    minChoices = 2,
    disabled = false,
    errorMessage = '',
    className = '',
}) {
    const radioGroupName = useId();

    return (
        <div
            className={`space-y-2 border-t border-neutral-950/5 pt-2 ${className}`}
        >
            <div className="flex items-center justify-between">
                <label className="font-inter text-body-sm font-bold text-neutral-700">
                    Answer Choices <span className="text-error-500">*</span>
                </label>
                <button
                    type="button"
                    disabled={choices.length >= maxChoices || disabled}
                    onClick={() => onAddChoice?.()}
                    className="font-inter text-caption inline-flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-950/10 bg-white px-2.5 py-1.5 font-bold text-neutral-950 transition-colors hover:border-neutral-950/20 disabled:pointer-events-none disabled:opacity-40"
                >
                    <Plus className="size-3" />
                    <span>Add Choice</span>
                </button>
            </div>

            <div className="space-y-2.5">
                {choices.map((choice, choiceIdx) => (
                    <div
                        key={choice.id}
                        className="flex items-center gap-2 rounded-xl border border-neutral-950/5 bg-neutral-50/50 p-2.5 transition-colors hover:border-neutral-950/10"
                    >
                        {/* Radio — the row carrying is_true is the correct answer */}
                        <input
                            type="radio"
                            name={`correct-choice-${radioGroupName}`}
                            checked={Boolean(choice.is_true)}
                            onChange={() =>
                                onCorrectChoiceIndexChange?.(choiceIdx)
                            }
                            className="accent-primary-700 size-4 shrink-0 cursor-pointer"
                            title="Mark as correct answer"
                        />

                        <ChoiceText
                            answerId={choice.id}
                            initialContent={choice.answer_content}
                            onSubmit={onRenameChoice}
                            placeholder={`Choice ${choiceIdx + 1}`}
                        />

                        {choices.length > minChoices && (
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onDeleteChoice?.(choice.id)}
                                className="hover:bg-error-50 hover:text-error-500 shrink-0 cursor-pointer rounded-lg p-1 text-neutral-500 transition-colors disabled:pointer-events-none disabled:opacity-40"
                                title="Delete Choice"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {errorMessage && (
                <p className="font-inter text-caption text-error-500">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}

/**
 * Inline choice editor — commits on Enter/blur, skips empty/unchanged
 * values, Escape reverts. Reports through
 * `onSubmit(answerId, content)`.
 */
function ChoiceText({ answerId, initialContent, onSubmit, placeholder }) {
    const [text, setText] = useState(initialContent);

    const commit = () => {
        const trimmed = text.trim();

        if (!trimmed || trimmed === initialContent) {
            setText(initialContent);
            return;
        }

        setText(trimmed);
        onSubmit?.(answerId, trimmed);
    };

    return (
        <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setText(initialContent);
                }
            }}
            placeholder={placeholder}
            className="font-inter text-body-sm flex-grow border-none bg-transparent px-1 text-neutral-950 outline-none"
        />
    );
}
