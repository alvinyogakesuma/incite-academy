import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { DropdownMenu } from 'radix-ui';
import {
    BookOpen,
    ChevronsUpDown,
    Compass,
    LayoutDashboard,
    LogOut,
    Menu,
    Swords,
    Trophy,
    User as UserIcon,
    X,
} from 'lucide-react';
import Logo from './Logo';
import Logomark from './Logomark';
import Logotype from './Logotype';

// The student sections. Home lives in the logo's link.
const navItems = [
    { name: 'Courses', icon: BookOpen, href: '/courses' },
    { name: 'Learning Paths', icon: Compass, href: '/learning-paths' },
    { name: 'Challenges', icon: Swords, href: '/challenges' },
    { name: 'Leaderboard', icon: Trophy, href: '/leaderboard' },
];

/**
 * Student navbar — brand link, section nav with the active
 * underline, the user dropdown, and a mobile drawer. Ported from
 * the deprecated app's StudentNavbar on the current design tokens.
 */
export default function StudentNavbar() {
    const { url, props } = usePage();
    const { auth } = props;

    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const user = auth?.user || {
        name: 'Student',
        email: 'student@example.com',
    };

    // The equipped character, shared on every request.
    const equippedAvatarUrl = auth?.equippedAvatarUrl;

    const initials = user.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // The shared auth user is plain data — the role column decides.
    const isAdmin = user?.role === 'admin';

    const cleanUrl = url.split('?')[0];

    const isActive = (href) => {
        if (cleanUrl === href) {
            return true;
        }

        // Highlight the parent nav on detail views.
        return cleanUrl.startsWith(`${href}/`);
    };

    return (
        <>
            {/* ========== TOP NAVBAR ========== */}
            <header className="sticky top-0 z-40 border-b border-neutral-950/5 bg-white/85 shadow-sm backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
                    {/* Left: Logo */}
                    <Logo />

                    {/* Right: Nav Links + User */}
                    <div className="flex h-full items-center gap-3">
                        {/* Desktop Nav Links */}
                        <nav className="hidden h-full items-center gap-5 md:flex">
                            {navItems.map((item) => {
                                const active = isActive(item.href);

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`font-inter text-body-sm relative flex h-full items-center whitespace-nowrap transition-colors duration-200 ${
                                            active
                                                ? 'text-primary-700 after:bg-primary-700 font-semibold after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full'
                                                : 'hover:text-primary-700 font-medium text-neutral-500'
                                        }`}
                                    >
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Divider */}
                        <span className="mx-1 hidden h-5 w-px bg-neutral-950/10 md:block" />

                        {/* User Dropdown */}
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <button className="group hidden cursor-pointer items-center gap-2 rounded-xl border border-transparent p-1.5 transition-all duration-200 select-none hover:border-neutral-950/5 hover:bg-neutral-50 md:flex">
                                    {equippedAvatarUrl ? (
                                        <img
                                            src={equippedAvatarUrl}
                                            alt={user.name}
                                            className="border-primary-700/10 group-hover:border-primary-700 shadow-primary-700/5 size-8 shrink-0 rounded-full border bg-white object-cover shadow-sm transition-all duration-200"
                                        />
                                    ) : (
                                        <div className="border-primary-700/10 bg-primary-50 text-primary-700 group-hover:bg-primary-700 shadow-primary-700/5 font-poppins text-body-sm flex size-8 shrink-0 items-center justify-center rounded-full border font-bold shadow-sm transition-all duration-200 group-hover:text-white">
                                            {initials}
                                        </div>
                                    )}
                                    <ChevronsUpDown className="hidden size-4 shrink-0 text-neutral-500 sm:block" />
                                </button>
                            </DropdownMenu.Trigger>

                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    align="end"
                                    sideOffset={8}
                                    className="animate-in fade-in zoom-in-95 z-50 min-w-[200px] rounded-2xl border border-neutral-950/5 bg-white p-1.5 shadow-xl duration-200 outline-none"
                                >
                                    <div className="mb-1 border-b border-neutral-950/5 px-3 py-2">
                                        <p className="font-inter text-body-sm truncate font-semibold text-neutral-950">
                                            {user.name}
                                        </p>
                                        <p className="font-inter text-caption truncate text-neutral-500">
                                            {user.email}
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <DropdownMenu.Item asChild>
                                            <Link
                                                href="/dashboard"
                                                className="font-inter text-body-sm hover:bg-primary-50 hover:text-primary-700 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-neutral-500 transition-colors duration-150 outline-none"
                                            >
                                                <LayoutDashboard className="size-4" />
                                                <span>Admin Dashboard</span>
                                            </Link>
                                        </DropdownMenu.Item>
                                    )}
                                    <DropdownMenu.Item asChild>
                                        <Link
                                            href="/profile"
                                            className="font-inter text-body-sm hover:bg-primary-50 hover:text-primary-700 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-neutral-500 transition-colors duration-150 outline-none"
                                        >
                                            <UserIcon className="size-4" />
                                            <span>Profile Settings</span>
                                        </Link>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Separator className="my-1 h-px bg-neutral-950/5" />
                                    <DropdownMenu.Item asChild>
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            className="font-inter text-body-sm text-error-600 hover:bg-error-50 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 outline-none"
                                        >
                                            <LogOut className="size-4" />
                                            <span>Sign Out</span>
                                        </Link>
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>

                        {/* Mobile Hamburger */}
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="hover:border-primary-700/10 hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-xl border border-transparent p-2 text-neutral-500 transition-colors md:hidden"
                            aria-label="Open menu"
                        >
                            <Menu className="size-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ========== MOBILE DRAWER ========== */}
            <div
                className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${
                    isMobileOpen
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0'
                }`}
            >
                <div
                    onClick={() => setIsMobileOpen(false)}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                <div
                    className={`absolute top-0 bottom-0 left-0 w-[280px] transform bg-white shadow-xl transition-transform duration-300 ease-out ${
                        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <div className="flex h-full flex-col">
                        <div className="flex items-center justify-between border-b border-neutral-950/5 px-5 py-4">
                            <Link
                                href="/"
                                onClick={() => setIsMobileOpen(false)}
                                className="flex items-center gap-2"
                            >
                                <Logomark />
                                <Logotype />
                            </Link>
                            <button
                                onClick={() => setIsMobileOpen(false)}
                                className="hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={`font-inter text-body-sm flex items-center gap-3 rounded-xl border px-4 py-3 font-medium transition-all duration-200 ${
                                            active
                                                ? 'border-primary-700/10 bg-primary-50 text-primary-700 shadow-primary-700/5 font-bold shadow-sm'
                                                : 'hover:bg-primary-50/60 hover:text-primary-700 border-transparent text-neutral-500'
                                        }`}
                                    >
                                        <Icon
                                            className={`size-[18px] shrink-0 ${
                                                active
                                                    ? 'text-primary-700'
                                                    : 'text-neutral-500'
                                            }`}
                                        />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-t border-neutral-950/5 p-4">
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                    <button className="group flex w-full cursor-pointer items-center justify-between rounded-xl border border-transparent p-2 transition-all duration-200 select-none hover:border-neutral-950/5 hover:bg-neutral-50">
                                        <div className="flex min-w-0 items-center gap-3">
                                            {equippedAvatarUrl ? (
                                                <img
                                                    src={equippedAvatarUrl}
                                                    alt={user.name}
                                                    className="border-primary-700/10 group-hover:border-primary-700 shadow-primary-700/5 size-9 shrink-0 rounded-full border bg-white object-cover shadow-sm transition-all duration-200"
                                                />
                                            ) : (
                                                <div className="border-primary-700/10 bg-primary-50 text-primary-700 group-hover:bg-primary-700 shadow-primary-700/5 font-poppins text-body-sm flex size-9 shrink-0 items-center justify-center rounded-full border font-bold shadow-sm transition-all duration-200 group-hover:text-white">
                                                    {initials}
                                                </div>
                                            )}
                                            <div className="min-w-0 text-left">
                                                <p className="font-inter text-body-sm group-hover:text-primary-700 truncate font-semibold text-neutral-950 transition-colors">
                                                    {user.name}
                                                </p>
                                                <p className="font-inter text-caption truncate text-neutral-500">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronsUpDown className="size-4 shrink-0 text-neutral-500" />
                                    </button>
                                </DropdownMenu.Trigger>

                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                        align="end"
                                        side="top"
                                        sideOffset={8}
                                        className="animate-in fade-in zoom-in-95 z-50 min-w-[220px] rounded-2xl border border-neutral-950/5 bg-white p-1.5 shadow-xl duration-200 outline-none"
                                    >
                                        {isAdmin && (
                                            <DropdownMenu.Item asChild>
                                                <Link
                                                    href="/dashboard"
                                                    className="font-inter text-body-sm hover:bg-primary-50 hover:text-primary-700 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-neutral-500 transition-colors duration-150 outline-none"
                                                >
                                                    <LayoutDashboard className="size-4" />
                                                    <span>Admin Dashboard</span>
                                                </Link>
                                            </DropdownMenu.Item>
                                        )}
                                        <DropdownMenu.Item asChild>
                                            <Link
                                                href="/profile"
                                                className="font-inter text-body-sm hover:bg-primary-50 hover:text-primary-700 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-neutral-500 transition-colors duration-150 outline-none"
                                            >
                                                <UserIcon className="size-4" />
                                                <span>Profile Settings</span>
                                            </Link>
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Separator className="my-1 h-px bg-neutral-950/5" />
                                        <DropdownMenu.Item asChild>
                                            <Link
                                                href="/logout"
                                                method="post"
                                                as="button"
                                                onClick={() =>
                                                    setIsMobileOpen(false)
                                                }
                                                className="font-inter text-body-sm text-error-600 hover:bg-error-50 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 outline-none"
                                            >
                                                <LogOut className="size-4" />
                                                <span>Sign Out</span>
                                            </Link>
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
