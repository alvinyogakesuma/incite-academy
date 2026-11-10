import Logomark from './Logomark';
import Logo from './Logo';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';

export default function AdminSidebarHeader({
    collapsed,
    isMobile,
    onExpand,
    onCollapse,
    onCloseMobile,
}) {
    return (
        <div
            className={`flex items-center justify-between border-b border-neutral-950/5 py-5 ${
                collapsed ? 'justify-center px-4' : 'px-6'
            }`}
        >
            <div className="flex min-w-0 items-center gap-2">
                {collapsed ? (
                    <button
                        onClick={onExpand}
                        className="group text-primary-600 hover:bg-primary-50 relative shrink-0 cursor-pointer rounded-lg p-1 transition-all duration-200 hover:scale-105 active:scale-95"
                        title="Expand Sidebar"
                    >
                        {/* resting: brand mark — fades out on hover/focus */}
                        <Logomark className="transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0" />
                        {/* hover: expand icon — fades in over the mark */}
                        <PanelLeftOpen className="absolute inset-0 m-auto size-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </button>
                ) : (
                    <Logo />
                )}
            </div>

            {!isMobile && !collapsed && (
                <button
                    onClick={onCollapse}
                    className="hover:bg-primary-50 hover:text-primary-600 hidden shrink-0 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors lg:flex"
                    title="Collapse Sidebar"
                >
                    <PanelLeftClose className="size-4" />
                </button>
            )}

            {isMobile && (
                <button
                    onClick={onCloseMobile}
                    className="hover:bg-primary-50 cursor-pointer rounded-lg p-1 transition-colors lg:hidden"
                >
                    <X className="size-5 text-neutral-500" />
                </button>
            )}
        </div>
    );
}
