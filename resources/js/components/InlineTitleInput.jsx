import { useEffect, useRef, useState } from 'react';

/**
 * Inline title editor — a title swaps itself for this input while
 * editing. The ChoiceText commit contract: Enter or blur commits
 * (skipping empty or unchanged values), Escape reverts, and
 * clicks inside never bubble (so an accordion header never
 * toggles while typing).
 */
export default function InlineTitleInput({
    initialTitle = '',
    onCommit,
    onCancel,
    className = '',
}) {
    const [title, setTitle] = useState(initialTitle);

    const inputRef = useRef(null);

    // Focus and select on mount — the whole title is one
    // overtype gesture away.
    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const commit = () => {
        const trimmed = title.trim();

        if (!trimmed || trimmed === initialTitle) {
            onCancel?.();
            return;
        }

        onCommit?.(trimmed);
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel?.();
                }
            }}
            className={`font-inter text-body-sm border-primary-700/40 focus:border-primary-700 focus:ring-primary-700/10 w-full min-w-0 rounded-lg border bg-white px-2 py-1 font-bold text-neutral-950 outline-none focus:ring-4 ${className}`}
        />
    );
}
