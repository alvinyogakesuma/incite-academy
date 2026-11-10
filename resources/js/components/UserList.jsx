import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Users as UsersIcon,
} from 'lucide-react';
import UserRow from './UserRow';
import UserMobileCard from './UserMobileCard';

const COLUMNS = [
    { label: 'User', field: 'name' },
    { label: 'Role', field: 'role' },
    { label: 'NIM/NIP', field: 'nim_nip' },
    { label: 'Department', field: 'major_department' },
    { label: 'Points', field: 'total_points' },
    { label: 'Joined', field: 'joined' },
];

export default function UserList({
    users,
    onEdit,
    onDelete,
    sortField,
    sortDirection,
    onSort,
    onResetFilters,
}) {
    const hasUsers = users.length > 0;

    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-950/5 bg-white shadow-sm">
            {/* Desktop / Tablet Table view (hidden on small viewports) */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-primary-50/20 border-b border-neutral-950/5">
                            {COLUMNS.map((column) => {
                                const isActive = sortField === column.field;
                                const SortIcon =
                                    isActive && sortDirection === 'asc'
                                        ? ArrowUp
                                        : isActive && sortDirection === 'desc'
                                          ? ArrowDown
                                          : ArrowUpDown;

                                return (
                                    <th
                                        key={column.field}
                                        onClick={() => onSort(column.field)}
                                        className="group font-poppins cursor-pointer px-6 py-4 text-[11px] font-bold tracking-wider text-neutral-950 uppercase select-none"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>{column.label}</span>
                                            <SortIcon
                                                className={`size-3 transition-colors ${
                                                    isActive
                                                        ? 'text-primary-700'
                                                        : 'text-neutral-500/30 group-hover:text-neutral-950'
                                                }`}
                                            />
                                        </div>
                                    </th>
                                );
                            })}
                            <th className="font-poppins px-6 py-4 text-right text-[11px] font-bold tracking-wider text-neutral-950 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-950/5">
                        {hasUsers ? (
                            users.map((user) => (
                                <UserRow
                                    key={user.id}
                                    user={user}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length + 1}
                                    className="px-6 py-12 text-center"
                                >
                                    <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                                        <UsersIcon className="size-8 animate-pulse opacity-40" />
                                        <p className="font-inter text-body-sm font-medium">
                                            No users match your filters.
                                        </p>
                                        <button
                                            onClick={onResetFilters}
                                            className="text-primary-700 mt-2 cursor-pointer text-xs font-bold hover:underline"
                                        >
                                            Clear filters and search query
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile layout: Card based items list (hidden on larger viewports) */}
            <div className="divide-y divide-neutral-950/5 md:hidden">
                {hasUsers ? (
                    users.map((user) => (
                        <UserMobileCard
                            key={user.id}
                            user={user}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))
                ) : (
                    <div className="p-10 text-center text-neutral-500">
                        <UsersIcon className="mx-auto size-8 animate-pulse opacity-40" />
                        <p className="font-inter text-body-sm mt-2 font-medium">
                            No users match your filters.
                        </p>
                        <button
                            onClick={onResetFilters}
                            className="text-primary-700 mt-2 cursor-pointer text-xs font-bold hover:underline"
                        >
                            Clear filters and search query
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
