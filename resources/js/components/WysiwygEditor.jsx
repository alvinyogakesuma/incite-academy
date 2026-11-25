import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Toolbar } from 'radix-ui';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    Quote,
    Code,
    Undo2,
    Redo2,
    ChevronDown,
} from 'lucide-react';

const toolbarButtonClass =
    'hover:text-primary-700 data-[state=on]:text-primary-700 cursor-pointer rounded-lg p-1.5 text-neutral-600 transition-colors hover:bg-neutral-950/5 data-[state=on]:bg-neutral-950/5';

/**
 * Rich text editor — TipTap core with a Radix Toolbar. Controlled
 * contract: `value` syncs in from the form, `onChange` emits
 * `(html, wordCount)` on every edit. `onBlur` fires when the editor
 * surface (or a toolbar button) loses focus, letting wrapper
 * components commit inline-style saves. `variant` sizes the editor
 * ('full' for article bodies, 'compact' for question text).
 * Content typography lives in app.css under the `.tiptap` scope.
 */
export default function WysiwygEditor({
    value = '',
    onChange,
    onBlur,
    placeholder = 'Start typing the lesson content...',
    variant = 'full',
    className = '',
}) {
    const editor = useEditor({
        immediatelyRender: false,
        shouldRerenderOnTransaction: true,
        editorProps: {
            handleDOMEvents: {
                blur: () => {
                    onBlur?.();
                    return false;
                },
            },
            // The editable carries the surface padding so every
            // click lands inside the editor — the frame stays a
            // plain scroll container with no dead zone around the
            // content.
            attributes: {
                class: variant === 'compact' ? 'p-3' : 'p-5',
            },
        },
        extensions: [
            StarterKit.configure({ link: false }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass:
                    'before:text-neutral-500/50 before:content-[attr(data-placeholder)] before:float-left before:h-0 before:pointer-events-none',
            }),
        ],
        content: value || '',
        onUpdate: ({ editor: current }) => {
            const html = current.getHTML();
            const words = current
                .getText()
                .trim()
                .split(/\s+/)
                .filter((word) => word.length > 0).length;
            onChange?.(html, words);
        },
    });

    // Sync external value changes into the editor without emitting updates.
    useEffect(() => {
        if (editor && value !== undefined && editor.getHTML() !== value) {
            editor.commands.setContent(value || '', {
                emitUpdate: false,
            });
        }
    }, [editor, value]);

    // ── Toolbar helpers ──────────────────────────────────────────
    const run = (fn) => () => {
        if (editor) fn(editor.chain().focus());
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="focus-within:border-primary-700 focus-within:ring-primary-700/10 flex flex-col overflow-hidden rounded-2xl border border-neutral-950/10 shadow-sm transition-all focus-within:ring-4">
                {/* TOOLBAR (Radix) */}
                <Toolbar.Root
                    className="flex shrink-0 flex-wrap items-center gap-1 border-b border-neutral-950/10 bg-neutral-50 p-2 select-none"
                    aria-label="Formatting toolbar"
                >
                    {/* Block style selector — native select so TipTap can
                        keep the text selection (preventDefault on mousedown). */}
                    <div className="relative mr-1">
                        <select
                            aria-label="Text style"
                            onChange={(e) => {
                                const style = e.target.value;
                                if (!editor) return;
                                if (style === 'p') {
                                    editor.chain().focus().setParagraph().run();
                                } else {
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleHeading({
                                            level: parseInt(
                                                style.charAt(1),
                                                10,
                                            ),
                                        })
                                        .run();
                                }
                            }}
                            value={
                                editor?.isActive('heading', { level: 1 })
                                    ? 'h1'
                                    : editor?.isActive('heading', { level: 2 })
                                      ? 'h2'
                                      : editor?.isActive('heading', {
                                              level: 3,
                                          })
                                        ? 'h3'
                                        : 'p'
                            }
                            className="font-inter text-body-sm cursor-pointer rounded-lg border border-neutral-950/5 bg-white py-1.5 pr-7 pl-2.5 font-semibold text-neutral-800 outline-none hover:border-neutral-950/15"
                        >
                            <option value="p">Normal Text</option>
                            <option value="h1">Heading 1</option>
                            <option value="h2">Heading 2</option>
                            <option value="h3">Heading 3</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-neutral-500" />
                    </div>

                    <Toolbar.Separator className="mx-1 h-4 w-px bg-neutral-950/10" />

                    {/* Font formatters */}
                    <div
                        className="flex items-center gap-1"
                        role="group"
                        aria-label="Text formatting"
                    >
                        <Toolbar.Button
                            onClick={run((chain) => chain.toggleBold().run())}
                            data-state={editor?.isActive('bold') ? 'on' : 'off'}
                            aria-pressed={editor?.isActive('bold') ?? false}
                            aria-label="Bold (Ctrl+B)"
                            title="Bold (Ctrl+B)"
                            className={toolbarButtonClass}
                        >
                            <Bold className="size-3.5" />
                        </Toolbar.Button>
                        <Toolbar.Button
                            onClick={run((chain) => chain.toggleItalic().run())}
                            data-state={
                                editor?.isActive('italic') ? 'on' : 'off'
                            }
                            aria-pressed={editor?.isActive('italic') ?? false}
                            aria-label="Italic (Ctrl+I)"
                            title="Italic (Ctrl+I)"
                            className={toolbarButtonClass}
                        >
                            <Italic className="size-3.5" />
                        </Toolbar.Button>
                        <Toolbar.Button
                            onClick={run((chain) =>
                                chain.toggleUnderline().run(),
                            )}
                            data-state={
                                editor?.isActive('underline') ? 'on' : 'off'
                            }
                            aria-pressed={
                                editor?.isActive('underline') ?? false
                            }
                            aria-label="Underline (Ctrl+U)"
                            title="Underline (Ctrl+U)"
                            className={toolbarButtonClass}
                        >
                            <UnderlineIcon className="size-3.5" />
                        </Toolbar.Button>
                        <Toolbar.Button
                            onClick={run((chain) => chain.toggleStrike().run())}
                            data-state={
                                editor?.isActive('strike') ? 'on' : 'off'
                            }
                            aria-pressed={editor?.isActive('strike') ?? false}
                            aria-label="Strikethrough"
                            title="Strikethrough"
                            className={toolbarButtonClass}
                        >
                            <Strikethrough className="size-3.5" />
                        </Toolbar.Button>
                    </div>

                    <Toolbar.Separator className="mx-1 h-4 w-px bg-neutral-950/10" />

                    {/* Lists */}
                    <div
                        className="flex items-center gap-1"
                        role="group"
                        aria-label="Lists"
                    >
                        <Toolbar.Button
                            onClick={run((chain) =>
                                chain.toggleBulletList().run(),
                            )}
                            data-state={
                                editor?.isActive('bulletList') ? 'on' : 'off'
                            }
                            aria-pressed={
                                editor?.isActive('bulletList') ?? false
                            }
                            aria-label="Bullet List"
                            title="Bullet List"
                            className={toolbarButtonClass}
                        >
                            <List className="size-3.5" />
                        </Toolbar.Button>
                        <Toolbar.Button
                            onClick={run((chain) =>
                                chain.toggleOrderedList().run(),
                            )}
                            data-state={
                                editor?.isActive('orderedList') ? 'on' : 'off'
                            }
                            aria-pressed={
                                editor?.isActive('orderedList') ?? false
                            }
                            aria-label="Numbered List"
                            title="Numbered List"
                            className={toolbarButtonClass}
                        >
                            <ListOrdered className="size-3.5" />
                        </Toolbar.Button>
                    </div>

                    <Toolbar.Separator className="mx-1 h-4 w-px bg-neutral-950/10" />

                    {/* Blockquote & code */}
                    <div
                        className="flex items-center gap-1"
                        role="group"
                        aria-label="Block elements"
                    >
                        <Toolbar.Button
                            onClick={run((chain) =>
                                chain.toggleBlockquote().run(),
                            )}
                            data-state={
                                editor?.isActive('blockquote') ? 'on' : 'off'
                            }
                            aria-pressed={
                                editor?.isActive('blockquote') ?? false
                            }
                            aria-label="Blockquote"
                            title="Blockquote"
                            className={toolbarButtonClass}
                        >
                            <Quote className="size-3.5" />
                        </Toolbar.Button>
                        <Toolbar.Button
                            onClick={run((chain) =>
                                chain.toggleCodeBlock().run(),
                            )}
                            data-state={
                                editor?.isActive('codeBlock') ? 'on' : 'off'
                            }
                            aria-pressed={
                                editor?.isActive('codeBlock') ?? false
                            }
                            aria-label="Code Block"
                            title="Code Block"
                            className={toolbarButtonClass}
                        >
                            <Code className="size-3.5" />
                        </Toolbar.Button>
                    </div>

                    <Toolbar.Separator className="mx-1 h-4 w-px bg-neutral-950/10" />

                    {/* History */}
                    <div
                        className="flex items-center gap-1"
                        role="group"
                        aria-label="History"
                    >
                        <Toolbar.Button
                            onClick={run((chain) => chain.undo().run())}
                            aria-label="Undo"
                            title="Undo"
                            className={toolbarButtonClass}
                        >
                            <Undo2 className="size-3.5" />
                        </Toolbar.Button>
                        <Toolbar.Button
                            onClick={run((chain) => chain.redo().run())}
                            aria-label="Redo"
                            title="Redo"
                            className={toolbarButtonClass}
                        >
                            <Redo2 className="size-3.5" />
                        </Toolbar.Button>
                    </div>
                </Toolbar.Root>

                {/* EDITABLE BODY */}
                <div
                    className={`font-inter flex flex-col overflow-y-auto bg-white text-neutral-800 ${
                        variant === 'compact'
                            ? 'max-h-[300px] min-h-[140px]'
                            : 'max-h-[500px] min-h-[360px]'
                    }`}
                >
                    {/* flex-1 stretches EditorContent to the frame,
                        and .tiptap's flex: 1 1 auto (app.css)
                        stretches the editable across the whole
                        surface — click anywhere focuses. */}
                    <EditorContent
                        editor={editor}
                        className="flex flex-1 flex-col"
                    />
                </div>
            </div>
        </div>
    );
}
