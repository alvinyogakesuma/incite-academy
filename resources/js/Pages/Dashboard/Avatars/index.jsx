import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { ListChecks, Plus, UserCircle, Users } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminHeader from '@/components/AdminHeader';
import SearchBar from '@/components/SearchBar';
import CardGrid from '@/components/CardGrid';
import CourseCard from '@/components/CourseCard';
import Pagination from '@/components/Pagination';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import {
    PAGE_SIZE_OPTIONS,
    paginateCourses,
} from '@/Pages/Dashboard/Courses/courseTable';
import {
    conditionTypeLabel,
    conditionsLabel,
} from '@/components/conditionsLogic';
import {
    AVATAR_GRADIENT,
    avatarDeleteDescription,
    avatarDeleteUrl,
    filterAvatars,
} from './avatarTable';

/**
 * Avatars management page — the listing UI (search, pagination,
 * delete dialog) built on the shared admin components: the
 * avatars render on the shared card with the character violet
 * cover, their icon or the UserCircle over it, and the unlock
 * criterion as the chip. Every action is wired to the avatar
 * routes: add creates a blank row server-side (the redirect chain
 * lands in the editor), edit opens the editor, and delete removes
 * the avatar with its awards. Ported from the deprecated app's
 * Avatars page onto this app's listing conventions.
 */
export default function Avatars({ avatars = [] }) {
    // Search State (all client-side — the deprecated page had no
    // filters or sort)
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

    // Deleting Data State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [avatarToDelete, setAvatarToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Add creates the blank row server-side — the redirect chain
    // lands in the avatar editor.
    const [isCreating, setIsCreating] = useState(false);

    const handleAddAvatar = () => {
        router.post(
            '/dashboard/avatars',
            {},
            {
                onStart: () => setIsCreating(true),
                onFinish: () => setIsCreating(false),
            },
        );
    };

    const startDelete = (avatar) => {
        setAvatarToDelete(avatar);
        setIsDeleteOpen(true);
    };

    // Reset Filters to defaults
    const handleResetFilters = () => {
        setSearchQuery('');
        setCurrentPage(1);
    };

    // it sets the value and sets the page to page 1
    const handleFilterChange = (setter, val) => {
        setter(val);
        setCurrentPage(1);
    };

    const confirmDelete = () => {
        // The delete flow's guard-composed URL: null means the
        // pending avatar carries no deletable id (the dialog only
        // opens via startDelete with a full row, so this is the
        // defensive early-return arm).
        const url = avatarDeleteUrl(avatarToDelete);

        if (!url) {
            return;
        }

        router.delete(url, {
            onStart: () => setIsDeleting(true),
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                setAvatarToDelete(null);
            },
        });
    };

    // Stage 1 = filter the avatars (search-only — the deprecated
    // page's shape)
    const filteredAvatars = useMemo(
        () => filterAvatars(avatars, { query: searchQuery }),
        [avatars, searchQuery],
    );

    // Stage 2 = Paginate the avatars (safePage clamps live on every
    // render)
    const {
        items: paginatedAvatars,
        totalPages,
        safePage,
    } = useMemo(
        () => paginateCourses(filteredAvatars, currentPage, pageSize),
        [filteredAvatars, currentPage, pageSize],
    );

    return (
        <div className="space-y-8">
            {/* ========== HEADER SECTION ========== */}
            <AdminHeader
                title="Avatars Management"
                subtitle="Create and manage character avatars for user profile pictures."
                label="Add Avatar"
                icon={Plus}
                onClick={handleAddAvatar}
                loading={isCreating}
            />

            {/* ========== CONTROLS SECTION ========== */}
            <SearchBar
                value={searchQuery}
                onChange={(val) => handleFilterChange(setSearchQuery, val)}
                placeholder="Search avatars by title or description..."
                showReset={Boolean(searchQuery)}
                onReset={handleResetFilters}
            />

            {/* ========== AVATAR CARDS GRID ========== */}
            <CardGrid
                items={paginatedAvatars}
                renderItem={(avatar) => (
                    <CourseCard
                        title={avatar.title}
                        description={avatar.description}
                        gradient={AVATAR_GRADIENT}
                        imageUrl={avatar.icon_url}
                        icon={UserCircle}
                        badgeText={conditionTypeLabel(avatar.condition_type)}
                        metaItems={[
                            {
                                icon: ListChecks,
                                label: conditionsLabel(avatar.conditions_count),
                            },
                            {
                                icon: Users,
                                label: `${avatar.recipients_count} Users`,
                            },
                        ]}
                        onEdit={() => {
                            router.get(`/dashboard/avatars/${avatar.id}/edit`);
                        }}
                        onDelete={() => startDelete(avatar)}
                        editTooltip="Edit Avatar"
                        deleteTooltip="Delete Avatar"
                    />
                )}
                emptyIcon={UserCircle}
                emptyTitle="No Avatars Found"
                emptyMessage="No avatars match your search keywords. Try resetting the filters to browse all character avatars."
                onReset={handleResetFilters}
            />

            {/* ========== PAGINATION CONTROLS ========== */}
            {filteredAvatars.length > 0 && (
                <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalRecords={filteredAvatars.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) =>
                        handleFilterChange(setPageSize, size)
                    }
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
            )}

            {/* ========== DELETE CONFIRMATION ALERT DIALOG (MODAL) ========== */}
            <DeleteConfirmationDialog
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                title="Delete Avatar"
                description={avatarDeleteDescription(avatarToDelete)}
                confirmLabel="Delete Avatar"
                onConfirm={confirmDelete}
                isSubmitting={isDeleting}
            />
        </div>
    );
}

Avatars.layout = (page) => <AdminLayout>{page}</AdminLayout>;
