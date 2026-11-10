import { Link } from '@inertiajs/react';
import { ScrollArea } from 'radix-ui';

export default function SidebarMenu({ menuItems, collapsed, onLinkClick }) {
    return (
        <ScrollArea.Root
            className={`flex-1 overflow-hidden py-6 ${
                collapsed ? 'px-3' : 'px-4'
            }`}
        >
            <ScrollArea.Viewport className="h-full w-full">
                <nav className="space-y-1.5">
                    {menuItems.map((item) => {
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onLinkClick}
                                className={`group font-inter text-body-sm flex items-center rounded-xl font-medium transition-all duration-200 ${
                                    collapsed
                                        ? 'justify-center p-3'
                                        : 'gap-3 px-4 py-3'
                                } ${
                                    item.active
                                        ? 'bg-primary-600 shadow-primary-600/10 text-neutral-50 shadow-md'
                                        : 'hover:bg-primary-50 hover:text-primary-600 text-neutral-500'
                                }`}
                                title={collapsed ? item.name : undefined}
                            >
                                <item.icon
                                    className={`size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                        item.active
                                            ? 'text-neutral-50'
                                            : 'group-hover:text-primary-600 text-neutral-500'
                                    }`}
                                />
                                {!collapsed && (
                                    <span className="truncate">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
                orientation="vertical"
                className="flex w-2 touch-none p-0.5 transition-colors select-none"
            >
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-neutral-950/10 hover:bg-neutral-950/20" />
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    );
}
