import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Plus, BookOpen, Headphones, PenTool, Clock, Star } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminHeader from '@/components/AdminHeader';
import SearchBar from '@/components/SearchBar';
import CardGrid from '@/components/CardGrid';
import CourseCard from '@/components/CourseCard';
import Pagination from '@/components/Pagination';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import {
    PAGE_SIZE_OPTIONS,
    SORT_OPTIONS,
    DEFAULT_SORT,
    filterCourses,
    sortCourses,
    paginateCourses,
    shouldShowReset,
    formatDuration,
    categoryThemeFor,
    categoryBadgeFor,
    hasDeletableId,
} from './courseTable';

const CATEGORY_MAP = {
    'Reading Comprehension': {
        icon: BookOpen,
        gradient:
            'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
    },
    'Listening Comprehension': {
        icon: Headphones,
        gradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
    },
    'Structure and Writing Expression': {
        icon: PenTool,
        gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
    },
};

/**
 * Courses management page — the listing UI (search, filters, sort,
 * pagination, delete dialog) with every server action wired to the
 * course routes: add creates a blank draft row server-side (the
 * redirect chain lands in the editor), edit opens the editor, and
 * delete removes the course with its files. The search, filter,
 * sort, and pagination decisions live in courseTable.js.
 */
export default function Courses({ courses = [], categories = [] }) {
    // Search, Filtering, and Sorting State (all client-side)
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [sortLabel, setSortLabel] = useState(DEFAULT_SORT.label);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

    // Deleting Data State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Add creates the blank draft row server-side — the redirect
    // chain lands in the course editor.
    const [isCreating, setIsCreating] = useState(false);

    const handleAddCourse = () => {
        router.post(
            '/dashboard/courses',
            {},
            {
                onStart: () => setIsCreating(true),
                onFinish: () => setIsCreating(false),
            },
        );
    };

    const startDelete = (course) => {
        setCourseToDelete(course);
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

    // Handle sort select change (options are label-based)
    const handleSortChange = (label) => {
        setSortLabel(label);
        setCurrentPage(1);
    };

    const confirmDelete = () => {
        if (!hasDeletableId(courseToDelete)) {
            return;
        }

        router.delete(`/dashboard/courses/${courseToDelete.id}`, {
            onStart: () => setIsDeleting(true),
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                setCourseToDelete(null);
            },
        });
    };

    // Stage 1 = filter the courses
    const filteredCourses = useMemo(
        () => filterCourses(courses, { query: searchQuery, categoryFilter }),
        [courses, searchQuery, categoryFilter],
    );

    // Stage 2 = Sort the Courses
    const sortedCourses = useMemo(
        () => sortCourses(filteredCourses, sortLabel),
        [filteredCourses, sortLabel],
    );

    // Stage 3 = Paginate the Courses (safePage clamps live on every render)
    const {
        items: paginatedCourses,
        totalPages,
        safePage,
    } = useMemo(
        () => paginateCourses(sortedCourses, currentPage, pageSize),
        [sortedCourses, currentPage, pageSize],
    );

    const showReset = shouldShowReset({
        searchQuery,
        categoryFilter,
        sortLabel,
    });

    const courseFilters = [
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
            onChange: handleSortChange,
            options: SORT_OPTIONS.map((option) => option.label),
        },
    ];

    return (
        <div className="space-y-8">
            {/* ========== HEADER SECTION ========== */}
            <AdminHeader
                title="Courses Management"
                subtitle="Manage courses, modules, lessons and training topics."
                label="Add Course"
                icon={Plus}
                onClick={handleAddCourse}
                loading={isCreating}
            />

            {/* ========== FILTERS & CONTROLS ========== */}
            <SearchBar
                value={searchQuery}
                onChange={(val) => handleFilterChange(setSearchQuery, val)}
                placeholder="Search courses by title or description..."
                filters={courseFilters}
                showReset={showReset}
                onReset={handleResetFilters}
            />

            {/* ========== CARD GRID LAYOUT ========== */}
            <CardGrid
                items={paginatedCourses}
                renderItem={(course) => {
                    const config = categoryThemeFor(
                        course.category,
                        CATEGORY_MAP,
                    );
                    return (
                        <CourseCard
                            title={course.title}
                            description={course.short_description}
                            gradient={config.gradient}
                            imageUrl={course.image_url}
                            status={course.status}
                            icon={config.icon}
                            badgeText={categoryBadgeFor(course.category)}
                            metaItems={[
                                {
                                    icon: Clock,
                                    label: formatDuration(
                                        course.total_duration,
                                    ),
                                },
                                {
                                    icon: BookOpen,
                                    label: `${course.modules_count} Modules`,
                                },
                                {
                                    icon: Star,
                                    label: `${course.total_points} pts`,
                                },
                            ]}
                            onEdit={() => {
                                router.get(
                                    `/dashboard/courses/${course.id}/edit`,
                                );
                            }}
                            onDelete={() => startDelete(course)}
                            editTooltip="Edit Course"
                            deleteTooltip="Delete Course"
                        />
                    );
                }}
                emptyIcon={BookOpen}
                emptyTitle="No Courses Found"
                emptyMessage="No courses match your search keywords or category filters. Try resetting the filters to browse all classes."
                onReset={handleResetFilters}
            />

            {/* ========== PAGINATION CONTROLS ========== */}
            {sortedCourses.length > 0 && (
                <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalRecords={sortedCourses.length}
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
                title="Delete Course Card"
                description={`Are you sure you want to delete ${courseToDelete?.title}? This action will permanently remove this course from the directory.`}
                confirmLabel="Delete Course"
                onConfirm={confirmDelete}
                isSubmitting={isDeleting}
            />
        </div>
    );
}

Courses.layout = (page) => <AdminLayout>{page}</AdminLayout>;
