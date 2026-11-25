import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Award, Calendar, Star } from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import { avatarBackgroundFor } from './leaderboard';
import { initialsFor } from '@/Pages/Profile/Edit/profileInfo';

// The decorative variety for initial avatars — eliminated to the
// covered leaderboard module (this page's verbatim copies of the
// hash pick and the initials derivation were duplicates).

/**
 * One student's public profile as seen from the leaderboard —
 * the identity card with their equipped character, the about
 * block, and the badges they wear. Ported from the deprecated
 * app's LeaderboardDetail on the current design tokens.
 */
export default function LeaderboardDetail({ student }) {
    return (
        <>
            <Head title={`${student.name} - Profile`} />

            <section className="bg-primary-50/40">
                <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-16 sm:px-8">
                    <Link
                        href="/leaderboard"
                        className="group font-inter text-body-sm hover:text-primary-700 inline-flex items-center gap-2 font-semibold text-neutral-500 transition-colors duration-150"
                    >
                        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Back to Leaderboard</span>
                    </Link>

                    {/* Identity card */}
                    <div className="flex flex-col items-center gap-6 rounded-3xl border border-neutral-950/5 bg-white p-6 shadow-xs sm:flex-row sm:items-start md:gap-8 md:p-8">
                        <div className="shrink-0">
                            <div
                                className={`font-poppins text-title-lg flex size-24 items-center justify-center overflow-hidden rounded-full border font-bold shadow-inner md:size-28 ${
                                    student.avatarUrl
                                        ? 'border-neutral-950/10 bg-white'
                                        : avatarBackgroundFor(student.name)
                                }`}
                            >
                                {student.avatarUrl ? (
                                    <img
                                        src={student.avatarUrl}
                                        alt={student.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    initialsFor(student.name)
                                )}
                            </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
                            <div className="space-y-1">
                                <h1 className="font-poppins text-title-lg truncate leading-tight font-bold text-neutral-950">
                                    {student.name}
                                </h1>
                                <p className="font-inter text-caption text-neutral-500">
                                    {student.nimNip ?? '—'} &middot;{' '}
                                    {student.organization ?? 'ITERA Student'}
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
                                <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-amber-600 shadow-2xs">
                                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                    <span className="font-poppins text-caption font-bold">
                                        {student.points.toLocaleString()} pts
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 rounded-xl border border-neutral-950/5 bg-neutral-50 px-3.5 py-1.5 text-neutral-500 shadow-2xs">
                                    <Calendar className="size-3.5 text-neutral-400" />
                                    <span className="font-inter text-caption font-medium">
                                        Joined {student.joinedDate}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* About */}
                    <div className="space-y-3 rounded-3xl border border-neutral-950/5 bg-white p-6 shadow-xs md:p-8">
                        <h2 className="font-poppins text-body-lg font-bold text-neutral-950">
                            About
                        </h2>
                        <p className="font-inter text-body-sm leading-relaxed text-neutral-500">
                            {student.biography || 'No biography available.'}
                        </p>
                    </div>

                    {/* Equipped badges */}
                    <div className="space-y-5 rounded-3xl border border-neutral-950/5 bg-white p-6 shadow-xs md:p-8">
                        <h2 className="font-poppins text-body-lg font-bold text-neutral-950">
                            Badges
                        </h2>

                        {student.badges.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {student.badges.map((badge) => (
                                    <div
                                        key={badge.id}
                                        className="flex items-center gap-4 rounded-2xl border border-neutral-950/5 bg-neutral-50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs"
                                    >
                                        <div className="bg-primary-700 flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm">
                                            {badge.icon_url ? (
                                                <img
                                                    src={badge.icon_url}
                                                    alt={badge.title}
                                                    className="size-full object-contain"
                                                />
                                            ) : (
                                                <Award className="size-5 shrink-0" />
                                            )}
                                        </div>
                                        <div className="min-w-0 space-y-0.5 text-left">
                                            <p className="font-poppins text-caption truncate leading-tight font-bold text-neutral-950">
                                                {badge.title}
                                            </p>
                                            <p className="font-inter text-[10px] leading-relaxed text-neutral-500">
                                                Achievement badge
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="font-inter text-body-sm text-neutral-500">
                                No badges earned yet.
                            </p>
                        )}
                    </div>
                </main>
            </section>
        </>
    );
}

LeaderboardDetail.layout = (page) => <StudentLayout>{page}</StudentLayout>;
