import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { ListChecks, Plus, Trophy, Users } from 'lucide-react';
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
    BADGE_GRADIENT,
    badgeDeleteDescription,
    badgeDeleteUrl,
    conditionsLabel,
    conditionLabelFor,
    filterBadges,
} from './badgeTable';

/**
 * Badges management page — the listing UI (search, pagination,
 * delete dialog) built on the shared admin components: the badges
 * render on the shared card with the achievement gold cover,
 * their icon or the Trophy over it, and the award criterion as
 * the chip. Every action is wired to the badge routes: add
 * creates a blank row server-side (the redirect chain lands in
 * the editor), edit opens the editor, and delete removes the
 * badge with its awards. Ported from the deprecated app's Badges
 * page onto this app's listing conventions.
 */
export default function Badges({ badges = [] }) {
    // Search State (all client-side — the deprecated page had no
    // filters or sort)
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

    // Deleting Data State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [badgeToDelete, setBadgeToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Add creates the blank row server-side — the redirect chain
    // lands in the badge editor.
    const [isCreating, setIsCreating] = useState(false);

    const handleAddBadge = () => {
        router.post(
            '/dashboard/badges',
            {},
            {
                onStart: () => setIsCreating(true),
                onFinish: () => setIsCreating(false),
            },
        );
    };

    const startDelete = (badge) => {
        setBadgeToDelete(badge);
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
        // pending badge carries no deletable id (the dialog only
        // opens via startDelete with a full row, so this is the
        // defensive early-return arm).
        const url = badgeDeleteUrl(badgeToDelete);

        if (!url) {
            return;
        }

        router.delete(url, {
            onStart: () => setIsDeleting(true),
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                setBadgeToDelete(null);
            },
        });
    };

    // Stage 1 = filter the badges (search-only — the deprecated
    // page's shape)
    const filteredBadges = useMemo(
        () => filterBadges(badges, { query: searchQuery }),
        [badges, searchQuery],
    );

    // Stage 2 = Paginate the badges (safePage clamps live on every
    // render)
    const {
        items: paginatedBadges,
        totalPages,
        safePage,
    } = useMemo(
        () => paginateCourses(filteredBadges, currentPage, pageSize),
        [filteredBadges, currentPage, pageSize],
    );

    return (
        <div className="space-y-8">
            {/* ========== HEADER SECTION ========== */}
            <AdminHeader
                title="Badges Management"
                subtitle="Create and manage achievement badges for students."
                label="Add Badge"
                icon={Plus}
                onClick={handleAddBadge}
                loading={isCreating}
            />

            {/* ========== CONTROLS SECTION ========== */}
            <SearchBar
                value={searchQuery}
                onChange={(val) => handleFilterChange(setSearchQuery, val)}
                placeholder="Search badges by title or description..."
                showReset={Boolean(searchQuery)}
                onReset={handleResetFilters}
            />

            {/* ========== BADGE CARDS GRID ========== */}
            <CardGrid
                items={paginatedBadges}
                renderItem={(badge) => (
                    <CourseCard
                        title={badge.title}
                        description={badge.description}
                        gradient={BADGE_GRADIENT}
                        imageUrl={badge.icon_url}
                        icon={Trophy}
                        badgeText={conditionLabelFor(badge.condition_type)}
                        metaItems={[
                            {
                                icon: ListChecks,
                                label: conditionsLabel(badge.conditions_count),
                            },
                            {
                                icon: Users,
                                label: `${badge.recipients_count} Users`,
                            },
                        ]}
                        onEdit={() => {
                            router.get(`/dashboard/badges/${badge.id}/edit`);
                        }}
                        onDelete={() => startDelete(badge)}
                        editTooltip="Edit Badge"
                        deleteTooltip="Delete Badge"
                    />
                )}
                emptyIcon={Trophy}
                emptyTitle="No Badges Found"
                emptyMessage="No badges match your search keywords. Try resetting the filters to browse all achievement badges."
                onReset={handleResetFilters}
            />

            {/* ========== PAGINATION CONTROLS ========== */}
            {filteredBadges.length > 0 && (
                <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalRecords={filteredBadges.length}
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
                title="Delete Badge"
                description={badgeDeleteDescription(badgeToDelete)}
                confirmLabel="Delete Badge"
                onConfirm={confirmDelete}
                isSubmitting={isDeleting}
            />
        </div>
    );
}

Badges.layout = (page) => <AdminLayout>{page}</AdminLayout>;
