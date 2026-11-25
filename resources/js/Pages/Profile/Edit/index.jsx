import { useEffect, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    Calendar,
    Check,
    Compass,
    Image as ImageIcon,
    Key,
    Lock,
    Star,
    User,
} from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import PersonalInfoTab from './PersonalInfoTab';
import PasswordTab from './PasswordTab';
import AvatarsTab from './AvatarsTab';
import BadgesTab from './BadgesTab';
import CourseProgressTab from './CourseProgressTab';
import PathsTab from './PathsTab';
import {
    initialsFor,
    guardErrorMessageFor,
    joinedDateLabel,
    pointsLabel,
} from './profileInfo';

const TAB_ITEMS = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'password', label: 'Change Password', icon: Key },
    { id: 'avatars', label: 'Avatars', icon: ImageIcon },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'courses', label: 'Course Progress', icon: BookOpen },
    { id: 'paths', label: 'Learning Paths', icon: Compass },
];

/**
 * Student profile settings — the header band with the student's
 * identity, their equipped avatar, and points, and the tabbed
 * settings card: personal info, password, the character avatars,
 * the badge showcase, and live progress across enrolled courses
 * and learning paths. Ported from the deprecated app's Profile on
 * the current design tokens.
 */
export default function Edit({
    majorDepartements = [],
    avatars = [],
    equippedAvatar = null,
    badges = [],
    courses = [],
    paths = [],
}) {
    const { auth, status, errors: pageErrors } = usePage().props;
    const user = auth?.user ?? {};

    const [activeTab, setActiveTab] = useState('personal');
    const [toast, setToast] = useState(null);

    const initials = initialsFor(user.name);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // The password update flashes its success through status.
    useEffect(() => {
        if (status) {
            showToast(status, 'success');
        }
    }, [status]);

    // The equip and toggle guards flow back as their error keys —
    // the toast decision lives in the covered profileInfo module,
    // serving both the avatar and badge flows.
    useEffect(() => {
        const message = guardErrorMessageFor(pageErrors);

        if (message) {
            showToast(message, 'error');
        }
    }, [pageErrors?.badge, pageErrors?.avatar]);

    const points = pointsLabel(user.total_points);

    const joinedDate = joinedDateLabel(user.created_at);

    return (
        <>
            <Head title="Student Profile Settings" />

            <div className="bg-primary-50/40 relative min-h-screen pb-20">
                {/* Toast */}
                {toast && (
                    <div
                        className={`animate-in slide-in-from-top fixed top-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-2xl duration-300 ${
                            toast.type === 'error'
                                ? 'border-rose-100 bg-rose-50 text-rose-800'
                                : 'border-primary-700/10 bg-white text-neutral-950'
                        }`}
                    >
                        <div
                            className={`shrink-0 rounded-xl p-2 ${
                                toast.type === 'error'
                                    ? 'bg-rose-100 text-rose-600'
                                    : 'bg-primary-50 text-primary-700'
                            }`}
                        >
                            {toast.type === 'error' ? (
                                <Lock className="size-4 shrink-0" />
                            ) : (
                                <Check className="size-4 shrink-0" />
                            )}
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-poppins text-body-sm font-bold">
                                {toast.type === 'error'
                                    ? 'Update Denied'
                                    : 'Profile Settings'}
                            </h4>
                            <p className="font-inter text-body-sm leading-normal text-neutral-500">
                                {toast.message}
                            </p>
                        </div>
                    </div>
                )}

                {/* ========== HEADER BAND ========== */}
                <div className="border-b border-neutral-950/5 bg-white">
                    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
                        <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-start md:text-left">
                            {/* Avatar — the equipped character or
                                the initials, with a jump to the
                                avatars tab */}
                            <div className="group relative">
                                <div className="border-primary-700/10 bg-primary-50 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border p-1 shadow-md md:size-28">
                                    {equippedAvatar ? (
                                        <img
                                            src={equippedAvatar}
                                            alt={user.name || 'Student'}
                                            className="size-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="font-poppins text-title-lg text-primary-700 font-bold">
                                            {initials || 'S'}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('avatars')}
                                    className="bg-primary-700 absolute right-0 bottom-0 cursor-pointer rounded-full border border-white p-2 text-white shadow-lg transition-transform duration-150 hover:scale-105"
                                    title="Change Avatar"
                                >
                                    <ImageIcon className="size-3.5" />
                                </button>
                            </div>

                            <div className="space-y-2 pt-2 md:pt-4">
                                <h1 className="font-poppins text-title-lg leading-none font-bold text-neutral-950">
                                    {user.name || 'Student'}
                                </h1>
                                <p className="font-inter text-body-sm text-neutral-500">
                                    {user.email}
                                </p>

                                <div className="flex flex-wrap items-center justify-center gap-4 pt-1 md:justify-start">
                                    <div className="border-primary-700/5 bg-primary-50 text-primary-700 font-inter text-caption flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold">
                                        <Star className="fill-primary-700 size-3.5" />
                                        <span>{points} poin</span>
                                    </div>
                                    {joinedDate && (
                                        <div className="font-inter text-caption flex items-center gap-1.5 rounded-full border border-neutral-950/5 bg-neutral-50 px-2.5 py-1 font-semibold text-neutral-500">
                                            <Calendar className="size-3.5" />
                                            <span>Joined {joinedDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========== SETTINGS CARD ========== */}
                <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                        {/* Tab rail — horizontal scroll on mobile */}
                        <div className="space-y-2 md:col-span-1">
                            <div className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 pb-2 md:hidden">
                                {TAB_ITEMS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`font-inter text-body-sm flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition-all outline-none ${
                                                isActive
                                                    ? 'border-primary-700 bg-primary-700 text-white shadow-sm'
                                                    : 'border-neutral-950/5 bg-white text-neutral-500 hover:bg-neutral-50'
                                            }`}
                                        >
                                            <Icon className="size-4" />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="hidden flex-col gap-1.5 rounded-2xl border border-neutral-950/5 bg-white p-3 shadow-sm md:flex">
                                {TAB_ITEMS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`font-inter text-body-sm flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold transition-all outline-none ${
                                                isActive
                                                    ? 'bg-primary-700 text-white shadow-sm'
                                                    : 'hover:bg-primary-50 hover:text-primary-700 text-neutral-500'
                                            }`}
                                        >
                                            <Icon className="size-4" />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tab content */}
                        <div className="md:col-span-3">
                            <div className="animate-in fade-in rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-sm duration-300 sm:p-8">
                                {activeTab === 'personal' && (
                                    <PersonalInfoTab
                                        majorDepartements={majorDepartements}
                                    />
                                )}

                                {activeTab === 'password' && <PasswordTab />}

                                {activeTab === 'avatars' && (
                                    <AvatarsTab avatars={avatars} />
                                )}

                                {activeTab === 'badges' && (
                                    <BadgesTab badges={badges} />
                                )}

                                {activeTab === 'courses' && (
                                    <CourseProgressTab courses={courses} />
                                )}

                                {activeTab === 'paths' && (
                                    <PathsTab paths={paths} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Edit.layout = (page) => <StudentLayout>{page}</StudentLayout>;
