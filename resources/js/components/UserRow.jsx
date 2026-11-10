import { Avatar, Tooltip } from 'radix-ui';
import { Star, Edit2, Trash2 } from 'lucide-react';

const AVATAR_COLOR_CLASSES = [
    'bg-pink-100 text-pink-700 border-pink-200/50',
    'bg-blue-100 text-blue-700 border-blue-200/50',
    'bg-teal-100 text-teal-700 border-teal-200/50',
    'bg-amber-100 text-amber-700 border-amber-200/50',
    'bg-purple-100 text-purple-700 border-purple-200/50',
    'bg-emerald-100 text-emerald-700 border-emerald-200/50',
    'bg-indigo-100 text-indigo-700 border-indigo-200/50',
];

export function getAvatarStyles(name) {
    const hash = name
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length];
}

export function getInitials(name) {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function UserAvatar({ name, size = 'sm' }) {
    const sizeClass = size === 'lg' ? 'size-10 text-sm' : 'size-9 text-xs';

    return (
        <Avatar.Root
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border select-none ${sizeClass} ${getAvatarStyles(name)}`}
        >
            <Avatar.Fallback
                className="font-poppins flex h-full w-full items-center justify-center font-bold"
                delayMs={0}
            >
                {getInitials(name)}
            </Avatar.Fallback>
        </Avatar.Root>
    );
}

export function ActionTooltip({ label, children }) {
    return (
        <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
                <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        sideOffset={6}
                        className="font-inter z-50 rounded-lg border border-neutral-950/5 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-950 shadow-md"
                    >
                        {label}
                        <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}

export default function UserRow({ user, onEdit, onDelete }) {
    const isStudent = user.role === 'student';

    return (
        <tr className="group/row hover:bg-primary-50/10 transition-colors">
            {/* User Info with Avatar */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} />
                    <div className="min-w-0">
                        <p className="group-hover/row:text-primary-700 font-inter text-body-sm truncate font-semibold text-neutral-950 transition-colors">
                            {user.name}
                        </p>
                        <p className="font-inter text-caption truncate text-neutral-500">
                            {user.email}
                        </p>
                    </div>
                </div>
            </td>

            {/* Role Badge */}
            <td className="px-6 py-4">
                <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize transition-colors ${
                        isStudent
                            ? 'border-blue-100 bg-blue-50 text-blue-700'
                            : 'border-error-100 bg-error-50 text-error-700'
                    }`}
                >
                    {user.role}
                </span>
            </td>

            {/* NIM / NIP */}
            <td className="px-6 py-4">
                <span className="font-inter font-mono text-[12px] font-medium text-neutral-950">
                    {user.nim_nip}
                </span>
            </td>

            {/* Department */}
            <td className="px-6 py-4">
                <span className="font-inter text-[12px] text-neutral-950">
                    {user.major_department}
                </span>
            </td>

            {/* Points Achievements */}
            <td className="px-6 py-4">
                <div className="text-warning-700 font-inter flex items-center gap-1 text-[12px] font-bold">
                    <Star className="text-warning-500 fill-warning-500 size-3.5" />
                    <span>{user.total_points.toLocaleString()}</span>
                </div>
            </td>

            {/* Joined Date */}
            <td className="px-6 py-4">
                <span className="font-inter text-[12px] text-neutral-500">
                    {new Date(user.joined).toLocaleDateString('en-GB')}
                </span>
            </td>

            {/* Actions */}
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <ActionTooltip label="Edit user">
                        <button
                            onClick={() => onEdit(user)}
                            className="hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors"
                            aria-label="Edit user"
                        >
                            <Edit2 className="size-3.5" />
                        </button>
                    </ActionTooltip>
                    <ActionTooltip label="Delete user">
                        <button
                            onClick={() => onDelete(user)}
                            className="hover:bg-error-50 hover:text-error-600 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-colors"
                            aria-label="Delete user"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </ActionTooltip>
                </div>
            </td>
        </tr>
    );
}
