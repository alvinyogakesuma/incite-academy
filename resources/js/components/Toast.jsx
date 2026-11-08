import { Toast as ToastPrimitive } from 'radix-ui';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({
    open,
    onOpenChange,
    title,
    description,
    type = 'success',
    duration = 5000,
}) {
    const icons = {
        success: <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />,
        error: <AlertCircle className="size-5 shrink-0 text-red-500" />,
        info: <Info className="text-primary-700 size-5 shrink-0" />,
    };

    const borders = {
        success: 'border-success-200',
        error: 'border-error-200',
        info: 'border-primary-200/20',
    };

    return (
        <ToastPrimitive.Provider swipeDirection="right">
            <ToastPrimitive.Root
                open={open}
                onOpenChange={onOpenChange}
                duration={duration}
                className={`flex w-full max-w-sm items-start gap-3 rounded-2xl border ${borders[type] || borders.success} data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-5 bg-neutral-50 p-4 shadow-xl transition-all`}
            >
                {icons[type] || icons.success}

                <div className="flex flex-1 flex-col gap-1">
                    {title && (
                        <ToastPrimitive.Title className="font-inter text-xs font-bold text-neutral-900">
                            {title}
                        </ToastPrimitive.Title>
                    )}
                    {description && (
                        <ToastPrimitive.Description className="font-inter text-xs text-neutral-600">
                            {description}
                        </ToastPrimitive.Description>
                    )}
                </div>

                <ToastPrimitive.Close className="cursor-pointer text-neutral-400 transition-colors hover:text-neutral-600">
                    <X className="size-4" />
                </ToastPrimitive.Close>
            </ToastPrimitive.Root>

            <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-50 flex max-w-[420px] flex-col gap-2 outline-none" />
        </ToastPrimitive.Provider>
    );
}
