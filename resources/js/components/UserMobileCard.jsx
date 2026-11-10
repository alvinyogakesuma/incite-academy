import { Star, Edit2, Trash2 } from 'lucide-react';
import { UserAvatar, ActionTooltip } from './UserRow';

export default function UserMobileCard({ user, onEdit, onDelete }) {
    const isStudent = user.role === 'student';

    return (
        <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} size="lg" />
                    <div className="min-w-0">
                        <h4 className="font-inter text-body-sm truncate leading-tight font-semibold text-neutral-950">
                            {user.name}
                        </h4>
                        <p className="font-inter text-caption mt-0.5 truncate text-neutral-500">
                            {user.email}
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 gap-1.5">
                    <ActionTooltip label="Edit user">
                        <button
                            onClick={() => onEdit(user)}
                            className="hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-xl border border-neutral-950/5 p-2 text-neutral-500 transition-colors"
                            aria-label="Edit user"
                        >
                            <Edit2 className="size-4" />
                        </button>
                    </ActionTooltip>
                    <ActionTooltip label="Delete user">
                        <button
                            onClick={() => onDelete(user)}
                            className="hover:bg-error-50 hover:text-error-600 cursor-pointer rounded-xl border border-neutral-950/5 p-2 text-neutral-500 transition-colors"
                            aria-label="Delete user"
                        >
                            <Trash2 className="size-4" />
                        </button>
                    </ActionTooltip>
                </div>
            </div>

            <div className="bg-primary-50/30 grid grid-cols-2 gap-x-2 gap-y-3 rounded-xl border border-neutral-950/5 p-3 text-[12px]">
                <div>
                    <span className="font-inter block text-[10px] font-semibold text-neutral-500 uppercase">
                        Role
                    </span>
                    <span
                        className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold capitalize transition-colors ${
                            isStudent
                                ? 'border-blue-100 bg-blue-50 text-blue-700'
                                : 'border-error-100 bg-error-50 text-error-700'
                        }`}
                    >
                        {user.role}
                    </span>
                </div>
                <div>
                    <span className="font-inter block text-[10px] font-semibold text-neutral-500 uppercase">
                        NIM/NIP
                    </span>
                    <span className="font-inter mt-0.5 block font-mono text-neutral-950">
                        {user.nim_nip}
                    </span>
                </div>
                <div>
                    <span className="font-inter block text-[10px] font-semibold text-neutral-500 uppercase">
                        Department
                    </span>
                    <span className="font-inter mt-0.5 block truncate text-neutral-950">
                        {user.major_department}
                    </span>
                </div>
                <div>
                    <span className="font-inter block text-[10px] font-semibold text-neutral-500 uppercase">
                        Points
                    </span>
                    <div className="text-warning-700 font-inter mt-0.5 flex items-center gap-1 font-bold">
                        <Star className="text-warning-500 fill-warning-500 size-3" />
                        <span>{user.total_points.toLocaleString()}</span>
                    </div>
                </div>
                <div>
                    <span className="font-inter block text-[10px] font-semibold text-neutral-500 uppercase">
                        Joined
                    </span>
                    <span className="font-inter mt-0.5 block text-neutral-950">
                        {new Date(user.joined).toLocaleDateString('en-GB')}
                    </span>
                </div>
            </div>
        </div>
    );
}
