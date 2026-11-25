import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Clock, ListChecks, Plus, Star, Swords } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminHeader from '@/components/AdminHeader';
import SearchBar from '@/components/SearchBar';
import CardGrid from '@/components/CardGrid';
import CourseCard from '@/components/CourseCard';
import Pagination from '@/components/Pagination';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import {
    PAGE_SIZE_OPTIONS,
    categoryBadgeFor,
    categoryThemeFor,
    formatDuration,
    paginateCourses,
    sortCourses,
} from '@/Pages/Dashboard/Courses/courseTable';
import {
    CHALLENGE_CATEGORY_GRADIENTS,
    DEFAULT_SORT,
    SORT_OPTIONS,
    challengeDeleteDescription,
    challengeDeleteUrl,
    filterChallenges,
    shouldShowReset,
} from './challengeTable';

/**
 * Challenges management page — the listing UI (search, filters,
 * sort, pagination, delete dialog) built on the shared admin
 * components. Every action is wired to the challenge routes: add
 * creates a blank row server-side (the redirect chain lands in
 * the editor), edit opens the editor, and delete removes the
 * challenge with its files. The page-specific filter and sort
 * options live in challengeTable.js; the navigation, theme, and
 * badge decisions reuse the covered courseTable.js helpers.
 */
export default function Challenges({ challenges = [], categories = [] }) {
    // Search, Filtering, and Sorting State (all client-side)
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [sortLabel, setSortLabel] = useState(DEFAULT_SORT.label);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

    // Deleting Data State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [challengeToDelete, setChallengeToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Add creates the blank row server-side — the redirect chain
    // lands in the challenge editor.
    const [isCreating, setIsCreating] = useState(false);

    const handleAddChallenge = () => {
        router.post(
            '/dashboard/challenges',
            {},
            {
                onStart: () => setIsCreating(true),
                onFinish: () => setIsCreating(false),
            },
        );
    };

    const startDelete = (challenge) => {
        setChallengeToDelete(challenge);
        setIsDeleteOpen(true);
    };

    // Reset Filters to defaults
    const handleResetFilters = () => {
        setSearchQuery('');
        setCategoryFilter('All');
        setSortLabel(DEFAULT_SORT.label);
        setCurrentPage(1);
    };

    // it sets the value and sets the page to page 1
    const handleFilterChange = (setter, val) => {
        setter(val);
        setCurrentPage(1);
    };

    const confirmDelete = () => {
        // The delete flow's guard-composed URL: null means the
        // pending challenge carries no deletable id (the dialog
        // only opens via startDelete with a full row, so this is
        // the defensive early-return arm).
        const url = challengeDeleteUrl(challengeToDelete);

        if (!url) {
            return;
        }

        router.delete(url, {
            onStart: () => setIsDeleting(true),
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                setChallengeToDelete(null);
            },
        });
    };

    // Stage 1 = filter the challenges
    const filteredChallenges = useMemo(
        () =>
            filterChallenges(challenges, {
                query: searchQuery,
                categoryFilter,
            }),
        [challenges, searchQuery, categoryFilter],
    );

    // Stage 2 = Sort the Challenges (the page's own label set)
    const sortedChallenges = useMemo(
        () => sortCourses(filteredChallenges, sortLabel, SORT_OPTIONS),
        [filteredChallenges, sortLabel],
    );

    // Stage 3 = Paginate the Challenges (safePage clamps live on every render)
    const {
        items: paginatedChallenges,
        totalPages,
        safePage,
    } = useMemo(
        () => paginateCourses(sortedChallenges, currentPage, pageSize),
        [sortedChallenges, currentPage, pageSize],
    );

    const showReset = shouldShowReset({
        searchQuery,
        categoryFilter,
        sortLabel,
    });

    const challengeFilters = [
        {
            name: 'category',
            label: 'Category:',
            value: categoryFilter,
            onChange: (val) => handleFilterChange(setCategoryFilter, val),
            options: ['All', ...categories],
        },
        {
            name: 'sort',
            label: 'Sort By:',
            value: sortLabel,
            onChange: (val) => handleFilterChange(setSortLabel, val),
            options: SORT_OPTIONS.map((option) => option.label),
        },
    ];

    return (
        <div className="space-y-8">
            {/* ========== HEADER SECTION ========== */}
            <AdminHeader
                title="Challenges Management"
                subtitle="Create and manage timed learning challenges."
                label="Add Challenge"
                icon={Plus}
                onClick={handleAddChallenge}
                loading={isCreating}
            />

            {/* ========== FILTERS & CONTROLS ========== */}
            <SearchBar
                value={searchQuery}
                onChange={(val) => handleFilterChange(setSearchQuery, val)}
                placeholder="Search challenges by title or description..."
                filters={challengeFilters}
                showReset={Boolean(showReset)}
                onReset={handleResetFilters}
            />

            {/* ========== CARD GRID LAYOUT ========== */}
            <CardGrid
                items={paginatedChallenges}
                renderItem={(challenge) => {
                    const gradient = categoryThemeFor(
                        challenge.category,
                        CHALLENGE_CATEGORY_GRADIENTS,
                    ).gradient;

                    return (
                        <CourseCard
                            title={challenge.title}
                            description={challenge.description}
                            gradient={gradient}
                            imageUrl={challenge.image_url}
                            icon={Swords}
                            badgeText={categoryBadgeFor(challenge.category)}
                            metaItems={[
                                {
                                    icon: Clock,
                                    label: formatDuration(challenge.duration),
                                },
                                {
                                    icon: Star,
                                    label: `${challenge.points} pts`,
                                },
                                {
                                    icon: ListChecks,
                                    label: `${challenge.questions_count} Questions`,
                                },
                            ]}
                            onEdit={() => {
                                router.get(
                                    `/dashboard/challenges/${challenge.id}/edit`,
                                );
                            }}
                            onDelete={() => startDelete(challenge)}
                            editTooltip="Edit Challenge"
                            deleteTooltip="Delete Challenge"
                        />
                    );
                }}
                emptyIcon={Swords}
                emptyTitle="No Challenges Found"
                emptyMessage="No challenges match your search keywords or category filters. Try resetting the filters to browse all challenges."
                onReset={handleResetFilters}
            />

            {/* ========== PAGINATION CONTROLS ========== */}
            {sortedChallenges.length > 0 && (
                <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalRecords={sortedChallenges.length}
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
                title="Delete Challenge"
                description={challengeDeleteDescription(challengeToDelete)}
                confirmLabel="Delete Challenge"
                onConfirm={confirmDelete}
                isSubmitting={isDeleting}
            />
        </div>
    );
}

Challenges.layout = (page) => <AdminLayout>{page}</AdminLayout>;
