import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight, Clock, Star, Trophy, Users } from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import StudentHero from '@/components/StudentHero';
import {
    avatarBackgroundFor,
    boardGapIndex,
    rankAccentText,
    rankTrophyClasses,
} from './leaderboard';
import { initialsFor, pointsLabel } from '@/Pages/Profile/Edit/profileInfo';

// The period pills — the calendar windows plus the all-time view.
const TABS = [
    { id: 'allTime', label: 'All Time' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
];

/**
 * The leaderboard — the top of the board plus a window that
 * follows the visiting student: the five leaders, then either
 * the literal next five or, ranked outside them, the student
 * and the four that follow. Period pills carve the calendar
 * windows out of the materialized tables. Ported from the
 * deprecated app's Leaderboard on the current design tokens,
 * with the deprecated's cache-fed twenty-row window replaced by
 * the dynamic ten-row one.
 */
export default function Leaderboard() {
    const {
        rankings = [],
        period,
        currentUserRank,
        totalStudents,
        lastUpdated,
    } = usePage().props;

    // The row where the board jumps to the visiting student's
    // neighborhood — the gap the divider fills.
    const gapIndex = boardGapIndex(rankings);

    return (
        <>
            <Head title="Leaderboard" />

            <StudentHero
                title="Leaderboard"
                description="See how you rank against other ITERA test takers. Take assessments to climb the ranks!"
                stats={[
                    {
                        label: 'Students',
                        value: totalStudents || '—',
                        icon: Users,
                        color: 'blue',
                    },
                    {
                        label: 'Your Rank',
                        value: currentUserRank ? `#${currentUserRank}` : '—',
                        icon: Trophy,
                        color: 'amber',
                    },
                    {
                        label: 'Updated',
                        value: lastUpdated ?? '—',
                        icon: Clock,
                        color: 'brand',
                    },
                ]}
                image="/images/challenges_explorer_image.png"
            />

            <section className="bg-primary-50/40">
                <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8 md:py-10">
                    {/* Period pills */}
                    <div className="mx-auto flex w-fit max-w-md gap-1 rounded-full bg-neutral-100 p-1 shadow-inner sm:w-full">
                        {TABS.map((tab) => {
                            const isSelected = period === tab.id;

                            return (
                                <Link
                                    key={tab.id}
                                    href={`/leaderboard?period=${tab.id}`}
                                    className={`font-inter text-caption flex-1 cursor-pointer rounded-full py-2.5 text-center font-semibold tracking-wide uppercase transition-all duration-200 ${
                                        isSelected
                                            ? 'scale-[1.01] bg-white font-bold text-neutral-950 shadow-sm'
                                            : 'text-neutral-500 hover:text-neutral-800'
                                    }`}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* The board */}
                    <div className="animate-in fade-in space-y-3.5 duration-200">
                        {rankings.map((item, index) => (
                            <div key={item.id} className="space-y-3.5">
                                {/* The jump to the student's
                                    neighborhood */}
                                {gapIndex === index && (
                                    <div
                                        aria-hidden="true"
                                        className="font-poppins text-body flex items-center justify-center gap-2 text-neutral-400 select-none"
                                    >
                                        <span className="h-1 w-6 rounded-full bg-neutral-300" />
                                        <span className="text-caption font-bold">
                                            • • •
                                        </span>
                                        <span className="h-1 w-6 rounded-full bg-neutral-300" />
                                    </div>
                                )}

                                <Link
                                    href={`/leaderboard/student/${item.id}`}
                                    className={`group flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                                        item.isCurrentUser
                                            ? 'border-primary-700/40 bg-primary-50/50 shadow-sm'
                                            : 'border-neutral-950/5 bg-white shadow-xs'
                                    }`}
                                >
                                    <div className="flex min-w-0 items-center gap-4">
                                        <div className="flex w-[56px] shrink-0 items-center gap-2.5">
                                            <span
                                                className={`font-poppins text-body w-4 text-center font-extrabold ${rankAccentText(item.rank)}`}
                                            >
                                                {item.rank}
                                            </span>
                                            <Trophy
                                                className={`size-4 ${rankTrophyClasses(item.rank)}`}
                                            />
                                        </div>

                                        <div
                                            className={`font-poppins text-caption flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-inner ${
                                                item.avatarUrl
                                                    ? 'border-neutral-950/10 bg-white'
                                                    : avatarBackgroundFor(
                                                          item.name,
                                                      )
                                            }`}
                                        >
                                            {item.avatarUrl ? (
                                                <img
                                                    src={item.avatarUrl}
                                                    alt={item.name}
                                                    className="size-full object-cover"
                                                />
                                            ) : (
                                                initialsFor(item.name)
                                            )}
                                        </div>

                                        <div className="min-w-0 space-y-0.5 text-left">
                                            <div className="flex items-center gap-2">
                                                <p
                                                    className={`font-inter text-body-sm truncate leading-tight font-bold ${
                                                        item.isCurrentUser
                                                            ? 'text-primary-700'
                                                            : 'text-neutral-950'
                                                    }`}
                                                >
                                                    {item.name}
                                                </p>
                                                {item.isCurrentUser && (
                                                    <span className="bg-primary-700/10 text-primary-700 font-poppins shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold tracking-widest uppercase">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-inter text-caption truncate text-neutral-500">
                                                {item.organization ??
                                                    'ITERA Student'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-4">
                                        <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-600 shadow-2xs">
                                            <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                            <span className="font-poppins text-caption font-bold">
                                                {pointsLabel(item.points)} pts
                                            </span>
                                        </div>
                                        <ChevronRight className="group-hover:text-primary-700 size-4 text-neutral-300 transition-colors duration-150" />
                                    </div>
                                </Link>
                            </div>
                        ))}

                        {rankings.length === 0 && (
                            <div className="rounded-2xl border border-neutral-950/5 bg-white p-16 text-center shadow-sm">
                                <div className="text-primary-700/60 bg-primary-50 mx-auto flex size-16 items-center justify-center rounded-full">
                                    <Trophy className="size-8 animate-pulse" />
                                </div>
                                <h3 className="font-poppins text-body mt-4 font-bold text-neutral-950">
                                    No Rankings Yet
                                </h3>
                                <p className="font-inter text-caption mx-auto mt-2 max-w-md leading-relaxed text-neutral-500">
                                    No students have earned points this period.
                                    Take an assessment to claim the first spot!
                                </p>
                            </div>
                        )}
                    </div>

                    {totalStudents > 0 && (
                        <div className="space-y-1 text-center">
                            <p className="font-inter text-body-sm text-neutral-500">
                                You are ranked{' '}
                                <span className="text-primary-700 font-bold">
                                    #{currentUserRank ?? '—'}
                                </span>{' '}
                                of {totalStudents} students
                            </p>
                            {lastUpdated && (
                                <p className="font-inter text-caption text-neutral-500/60">
                                    Rankings updated {lastUpdated}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}

Leaderboard.layout = (page) => <StudentLayout>{page}</StudentLayout>;
