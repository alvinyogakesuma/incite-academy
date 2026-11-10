import { GraduationCap, Menu } from 'lucide-react';

export default function AdminMobileHeader({ onMenuClick }) {
    return (
        <header className="flex shrink-0 items-center justify-between border-b border-neutral-950/5 bg-neutral-50 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-2">
                <GraduationCap className="text-primary-600 size-6" />
                <p className="font-poppins text-body-sm leading-none font-bold tracking-wider">
                    <span className="text-neutral-950">INCITE </span>
                    <span className="text-primary-600">ACADEMY</span>
                </p>
            </div>
            <button
                onClick={onMenuClick}
                className="border-primary-600/5 bg-primary-50 hover:bg-primary-600/10 cursor-pointer rounded-xl border p-1.5 transition-colors"
                aria-label="Toggle Menu"
            >
                <Menu className="text-primary-600 size-5" />
            </button>
        </header>
    );
}
