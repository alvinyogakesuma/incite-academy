import { router, usePage } from '@inertiajs/react';
import { Check, Lock, Star, UserCircle } from 'lucide-react';
import { pointsLabel } from './profileInfo';
import {
    avatarAccessState,
    avatarCardClasses,
    avatarEquipUrl,
} from './profileAvatars';

/**
 * The character avatars tab — the unlockable profile pictures:
 * earned cards equip on click (exclusively — the server clears the
 * previous pick), unearned ones stay locked behind their point
 * thresholds. The access classification and the card styling live
 * in the covered profileAvatars module; the points chip reuses the
 * personal info suite's covered formatting.
 */
export default function AvatarsTab({ avatars = [] }) {
    const { auth } = usePage().props;
    const points = pointsLabel(auth?.user?.total_points);

    const handleAvatarSelect = (avatar) => {
        // The equip flow's guard-composed URL: locked cards and
        // the already-equipped pick resolve to the no-op arm.
        const url = avatarEquipUrl(avatar);

        if (!url) {
            return;
        }

        router.post(url, {}, { preserveScroll: true });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-poppins text-body-lg font-bold text-neutral-950">
                            Character Avatars
                        </h2>
                        <p className="font-inter text-body-sm text-neutral-500">
                            Unlock and set special characters as your profile
                            picture by earning points.
                        </p>
                    </div>
                    <div className="border-primary-700/5 bg-primary-50 text-primary-700 font-inter text-caption flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-bold">
                        <Star className="fill-primary-700 size-3" />
                        <span>{points} Total Poin</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {avatars.map((avatar) => {
                    const state = avatarAccessState(avatar);

                    return (
                        <button
                            key={avatar.id}
                            type="button"
                            onClick={() => handleAvatarSelect(avatar)}
                            className={`relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border p-4 text-center transition-all ${avatarCardClasses(avatar)}`}
                        >
                            {/* The character — its icon or the fallback,
                                locked ones dimmed under a lock overlay */}
                            <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-neutral-950/10 bg-white p-0.5 shadow-sm md:size-20">
                                {avatar.icon_url ? (
                                    <img
                                        src={avatar.icon_url}
                                        alt={avatar.title}
                                        className={`size-full rounded-full object-cover ${
                                            state === 'locked' &&
                                            'brightness-75 grayscale'
                                        }`}
                                    />
                                ) : (
                                    <UserCircle
                                        className={`text-primary-700 size-full rounded-full ${
                                            state === 'locked' && 'grayscale'
                                        }`}
                                    />
                                )}
                                {state === 'locked' && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-white">
                                        <Lock className="size-4" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <h4 className="font-poppins text-caption font-bold text-neutral-950">
                                    {avatar.title}
                                </h4>
                                <p className="font-inter text-caption line-clamp-2 px-1 leading-relaxed text-neutral-500">
                                    {avatar.description}
                                </p>
                            </div>

                            {state === 'equipped' ? (
                                <div className="absolute top-2 right-2 rounded-full bg-emerald-500 p-1 text-white shadow-md">
                                    <Check className="size-2.5 stroke-[3]" />
                                </div>
                            ) : state === 'unlocked' ? (
                                <span className="font-inter text-caption absolute top-2 right-2 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600">
                                    Unlocked
                                </span>
                            ) : (
                                <span className="font-inter text-caption absolute top-2 right-2 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 font-bold text-rose-600">
                                    <Lock className="inline size-2" /> Locked
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {avatars.length === 0 && (
                <div className="font-inter text-body-sm py-10 text-center font-medium text-neutral-500">
                    No avatars available yet. Earn points to start unlocking!
                </div>
            )}
        </div>
    );
}
