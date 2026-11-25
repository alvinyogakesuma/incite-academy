import { Link, usePage } from '@inertiajs/react';
import { DropdownMenu } from 'radix-ui';
import { ChevronsUpDown, Home, LogOut } from 'lucide-react';

export default function SidebarProfile({ user, initials, collapsed }) {
    // The equipped character, shared on every request.
    const equippedAvatarUrl = usePage().props.auth?.equippedAvatarUrl;

    return (
        <div
            className={`border-t border-neutral-950/5 ${collapsed ? 'p-3' : 'p-4'}`}
        >
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        className={`group hover:bg-primary-50 flex w-full cursor-pointer items-center justify-between rounded-xl transition-all duration-200 select-none ${
                            collapsed ? 'justify-center p-2' : 'p-2.5'
                        }`}
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            {equippedAvatarUrl ? (
                                <img
                                    src={equippedAvatarUrl}
                                    alt={user.name}
                                    className="border-primary-600/10 group-hover:border-primary-600 size-9 shrink-0 rounded-full border bg-white object-cover transition-colors"
                                />
                            ) : (
                                <div className="border-primary-600/10 bg-primary-50 font-poppins text-primary-600 group-hover:bg-primary-600 text-body-sm flex size-9 shrink-0 items-center justify-center rounded-full border font-bold transition-colors group-hover:text-neutral-50">
                                    {initials}
                                </div>
                            )}
                            {!collapsed && (
                                <div className="min-w-0 text-left">
                                    <p className="font-inter group-hover:text-primary-600 text-body-sm truncate font-semibold text-neutral-950 transition-colors">
                                        {user.name}
                                    </p>
                                    <p className="font-inter text-caption truncate text-neutral-500">
                                        {user.email}
                                    </p>
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <ChevronsUpDown className="ml-2 size-4 shrink-0 text-neutral-500" />
                        )}
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align={collapsed ? 'center' : 'end'}
                        side={collapsed ? 'right' : 'bottom'}
                        sideOffset={8}
                        className="animate-in fade-in slide-in-from-bottom-2 z-50 min-w-[200px] rounded-xl border border-neutral-950/5 bg-neutral-50 p-1.5 shadow-xl duration-150"
                    >
                        <DropdownMenu.Item asChild>
                            <Link
                                href="/home"
                                className="font-inter text-body-sm hover:bg-primary-50 hover:text-primary-700 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-neutral-500 transition-colors outline-none"
                            >
                                <Home className="size-4" />
                                <span>Home Page</span>
                            </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="font-inter text-body-sm flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-red-600 outline-none hover:bg-red-50"
                            >
                                <LogOut className="size-4" />
                                <span>Sign Out</span>
                            </Link>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    );
}
