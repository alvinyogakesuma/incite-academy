import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { BookOpen, Clock, Feather, Plus } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminHeader from '@/components/AdminHeader';
import SearchBar from '@/components/SearchBar';
import CardGrid from '@/components/CardGrid';
import CourseCard from '@/components/CourseCard';
import Pagination from '@/components/Pagination';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import {
    PAGE_SIZE_OPTIONS,
    categoryThemeFor,
    formatDuration,
    paginateCourses,
    sortCourses,
} from '@/Pages/Dashboard/Courses/courseTable';
import {
    DEFAULT_SORT,
    LEVEL_CONFIGS,
    SORT_OPTIONS,
    filterLearningPaths,
    learningPathDeleteDescription,
    learningPathDeleteUrl,
    levelBadgeText,
    shouldShowReset,
} from './learningPathTable';

/**
 * Learning paths management page — the listing UI (search,
 * filters, sort, pagination, delete dialog) built on the shared
 * admin components. Every action is wired to the learning path
 * routes: add creates a blank row server-side (the redirect
 * chain lands in the editor), edit opens the editor, and delete
 * removes the path with its files. Ported from the deprecated
 * app's LearningPaths page onto this app's listing conventions.
 */
export default function LearningPaths({ learningPaths = [], levels = [] }) {
    // Search, Filtering, and Sorting State (all client-side)
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState('All');
    const [sortLabel, setSortLabel] = useState(DEFAULT_SORT.label);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

    // Deleting Data State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pathToDelete, setPathToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Add creates the blank row server-side — the redirect chain
    // lands in the learning path editor.
    const [isCreating, setIsCreating] = useState(false);

    const handleAddLearningPath = () => {
        router.post(
            '/dashboard/learning-paths',
            {},
            {
                onStart: () => setIsCreating(true),
                onFinish: () => setIsCreating(false),
            },
        );
    };

    const startDelete = (path) => {
        setPathToDelete(path);
        setIsDeleteOpen(true);
    };

    // Reset Filters to defaults
    const handleResetFilters = () => {
        setSearchQuery('');
        setLevelFilter('All');
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
        // pending path carries no deletable id (the dialog only
        // opens via startDelete with a full row, so this is the
        // defensive early-return arm).
        const url = learningPathDeleteUrl(pathToDelete);

        if (!url) {
            return;
        }

        router.delete(url, {
            onStart: () => setIsDeleting(true),
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                setPathToDelete(null);
            },
        });
    };

    // Stage 1 = filter the learning paths
    const filteredPaths = useMemo(
        () =>
            filterLearningPaths(learningPaths, {
                query: searchQuery,
                levelFilter,
            }),
        [learningPaths, searchQuery, levelFilter],
    );

    // Stage 2 = Sort the learning paths (the page's own label set)
    const sortedPaths = useMemo(
        () => sortCourses(filteredPaths, sortLabel, SORT_OPTIONS),
        [filteredPaths, sortLabel],
    );

    // Stage 3 = Paginate the learning paths (safePage clamps live on every render)
    const {
        items: paginatedPaths,
        totalPages,
        safePage,
    } = useMemo(
        () => paginateCourses(sortedPaths, currentPage, pageSize),
        [sortedPaths, currentPage, pageSize],
    );

    const showReset = shouldShowReset({
        searchQuery,
        levelFilter,
        sortLabel,
    });

    const pathFilters = [
        {
            name: 'level',
            label: 'Level:',
            value: levelFilter,
            onChange: (val) => handleFilterChange(setLevelFilter, val),
            options: ['All', ...levels],
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
                title="Learning Path Management"
                subtitle="Create and manage learning paths with course sequences."
                label="Add Learning Path"
                icon={Plus}
                onClick={handleAddLearningPath}
                loading={isCreating}
            />

            {/* ========== FILTERS & CONTROLS ========== */}
            <SearchBar
                value={searchQuery}
                onChange={(val) => handleFilterChange(setSearchQuery, val)}
                placeholder="Search learning paths by title or description..."
                filters={pathFilters}
                showReset={Boolean(showReset)}
                onReset={handleResetFilters}
            />

            {/* ========== CARD GRID LAYOUT ========== */}
            <CardGrid
                items={paginatedPaths}
                renderItem={(path) => {
                    const config = categoryThemeFor(
                        path.level,
                        LEVEL_CONFIGS,
                        'All Levels',
                    );

                    return (
                        <CourseCard
                            title={path.title}
                            description={path.description}
                            gradient={config.gradient}
                            imageUrl={path.image_url}
                            icon={config.icon}
                            badgeText={levelBadgeText(path.level)}
                            metaItems={[
                                {
                                    icon: Clock,
                                    label: formatDuration(path.total_duration),
                                },
                                {
                                    icon: BookOpen,
                                    label: `${path.courses_count} Courses`,
                                },
                            ]}
                            onEdit={() => {
                                router.get(
                                    `/dashboard/learning-paths/${path.id}/edit`,
                                );
                            }}
                            onDelete={() => startDelete(path)}
                            editTooltip="Edit Learning Path"
                            deleteTooltip="Delete Learning Path"
                        />
                    );
                }}
                emptyIcon={Feather}
                emptyTitle="No Learning Paths Found"
                emptyMessage="No learning paths match your search keywords or level filters. Try resetting the filters to browse all learning paths."
                onReset={handleResetFilters}
            />

            {/* ========== PAGINATION CONTROLS ========== */}
            {sortedPaths.length > 0 && (
                <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalRecords={sortedPaths.length}
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
                title="Delete Learning Path"
                description={learningPathDeleteDescription(pathToDelete)}
                confirmLabel="Delete Learning Path"
                onConfirm={confirmDelete}
                isSubmitting={isDeleting}
            />
        </div>
    );
}

LearningPaths.layout = (page) => <AdminLayout>{page}</AdminLayout>;
