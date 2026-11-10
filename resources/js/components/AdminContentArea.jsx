import { ScrollArea } from 'radix-ui';

export default function AdminContentArea({ children }) {
    return (
        <ScrollArea.Root className="flex-1 overflow-hidden">
            <ScrollArea.Viewport className="h-full w-full">
                <main className="px-4 py-6 md:px-8 md:py-8">
                    <div className="mx-auto w-full max-w-6xl">{children}</div>
                </main>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
                orientation="vertical"
                className="flex w-2.5 touch-none p-0.5 transition-colors select-none"
            >
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-neutral-950/10 hover:bg-neutral-950/20" />
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    );
}
