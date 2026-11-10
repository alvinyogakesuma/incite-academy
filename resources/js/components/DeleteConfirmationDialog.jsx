import { AlertDialog } from 'radix-ui';
import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    confirmLabel = 'Delete',
    cancelText = 'Cancel',
    isSubmitting = false,
}) {
    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <AlertDialog.Content className="animate-in fade-in zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-2xl duration-200 outline-none md:p-8">
                    <div className="mb-5 flex items-start gap-4">
                        <div className="border-error-100 bg-error-50 text-error-600 shrink-0 rounded-2xl border p-3">
                            <AlertTriangle className="size-5 shrink-0" />
                        </div>
                        <div className="min-w-0">
                            <AlertDialog.Title className="font-poppins text-base font-bold text-neutral-950">
                                {title}
                            </AlertDialog.Title>
                            <AlertDialog.Description className="font-inter text-caption mt-1 leading-relaxed text-neutral-500">
                                {description}
                            </AlertDialog.Description>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-neutral-950/5 pt-4">
                        <AlertDialog.Cancel asChild>
                            <button className="font-inter text-body-sm cursor-pointer rounded-full border border-neutral-950/5 px-4 py-2 font-bold text-neutral-950 transition-colors hover:bg-neutral-50 active:scale-95">
                                {cancelText}
                            </button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <button
                                onClick={onConfirm}
                                disabled={isSubmitting}
                                className={`font-inter text-body-sm cursor-pointer rounded-full px-5 py-2 font-bold text-white transition-all ${
                                    isSubmitting
                                        ? 'bg-error-400 cursor-not-allowed'
                                        : 'bg-error-600 hover:bg-error-700 active:scale-95'
                                }`}
                            >
                                {isSubmitting ? 'Deleting...' : confirmLabel}
                            </button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
