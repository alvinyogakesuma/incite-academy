import { router } from '@inertiajs/react';
import { Check, Lock, Trophy } from 'lucide-react';
import {
    badgeCardClasses,
    badgeShowcaseState,
    badgeToggleUrl,
    equippedBadgeCount,
} from './profileBadges';

/**
 * The badge showcase tab — every badge with its earned and
 * equipped state: earned badges toggle their showcase slot (at
 * most three at a time, guarded server-side), unearned ones stay
 * locked. The showcase classification, the card styling, and the
 * displayed tally live in the covered profileBadges module; the
 * toggle flow's guard is feature 6's scope.
 */
export default function BadgesTab({ badges = [] }) {
    const equippedCount = equippedBadgeCount(badges);

    const handleBadgeSelect = (badge) => {
        // The toggle flow's guard-composed URL: a locked badge is
        // the no-op arm; a displayed badge rides the same URL as
        // the others because the server un-displays it.
        const url = badgeToggleUrl(badge);

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
                            Badges Showcase
                        </h2>
                        <p className="font-inter text-body-sm text-neutral-500">
                            Track your academic achievements and challenges
                            milestone accomplishments.
                        </p>
                    </div>
                    <div className="border-primary-700/5 bg-primary-50 text-primary-700 font-inter text-caption shrink-0 rounded-full border px-3 py-1.5 font-bold">
                        {equippedCount}/3 Displayed
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {badges.map((badge) => {
                    const state = badgeShowcaseState(badge);

                    return (
                        <button
                            key={badge.id}
                            type="button"
                            onClick={() => handleBadgeSelect(badge)}
                            className={`relative flex items-start gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all ${badgeCardClasses(badge)}`}
                        >
                            <div
                                className={`shrink-0 rounded-2xl border p-3 ${
                                    state === 'locked'
                                        ? 'border-neutral-200 bg-neutral-100 text-neutral-400'
                                        : 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                }`}
                            >
                                {state === 'locked' ? (
                                    <Lock className="size-6 shrink-0" />
                                ) : badge.icon_url ? (
                                    <img
                                        src={badge.icon_url}
                                        alt={badge.title}
                                        className="size-6 shrink-0"
                                    />
                                ) : (
                                    <Trophy className="size-6 shrink-0" />
                                )}
                            </div>

                            <div className="space-y-1 py-0.5">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-poppins text-body-sm font-bold text-neutral-950">
                                        {badge.title}
                                    </h4>
                                    {state === 'displaying' ? (
                                        <span className="font-inter border-primary-700/20 bg-primary-50 text-primary-700 text-caption rounded-md border px-1.5 py-0.5 font-bold tracking-wide uppercase">
                                            Displaying
                                        </span>
                                    ) : state === 'earned' ? (
                                        <span className="font-inter text-caption rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 font-bold tracking-wide text-emerald-600 uppercase">
                                            Earned
                                        </span>
                                    ) : (
                                        <span className="font-inter text-caption rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-bold tracking-wide text-neutral-500 uppercase">
                                            Locked
                                        </span>
                                    )}
                                </div>
                                <p className="font-inter text-body-sm leading-relaxed text-neutral-500">
                                    {badge.description}
                                </p>
                            </div>

                            {state === 'displaying' && (
                                <div className="bg-primary-700 absolute top-2 right-2 rounded-full p-1 text-white shadow-md">
                                    <Check className="size-2.5 stroke-[3]" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {badges.length === 0 && (
                <div className="font-inter text-body-sm py-10 text-center font-medium text-neutral-500">
                    No badges available yet. Earn points to start collecting!
                </div>
            )}
        </div>
    );
}
