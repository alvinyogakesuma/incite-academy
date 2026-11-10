import { useState, useMemo } from 'react';
import orderBy from 'lodash/orderBy';
import { Plus, BookOpen, Headphones, PenTool, Clock, Star } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminHeader from '@/components/AdminHeader';
import SearchBar from '@/components/SearchBar';
import CardGrid from '@/components/CardGrid';
import CourseCard from '@/components/CourseCard';
import Pagination from '@/components/Pagination';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import Toast from '@/components/Toast';
import { DUMMY_COURSES } from '@/data/dummyCourses';

const PAGE_SIZE_OPTIONS = [4, 8, 12];

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

const CATEGORIES = [
    'Reading Comprehension',
    'Listening Comprehension',
    'Structure and Writing Expression',
];

const SORT_OPTIONS = [
    { label: 'Title: A - Z', field: 'title', direction: 'asc' },
    { label: 'Title: Z - A', field: 'title', direction: 'desc' },
    { label: 'Duration: Low to High', field: 'duration', direction: 'asc' },
    { label: 'Duration: High to Low', field: 'duration', direction: 'desc' },
    { label: 'Modules: Low to High', field: 'modules', direction: 'asc' },
    { label: 'Modules: High to Low', field: 'modules', direction: 'desc' },
];

const DEFAULT_SORT = SORT_OPTIONS[0];

export default function Courses() {
    // Courses data — local state for now; swapped for real props once the
    // backend CRUD controller exists.
    const [courses, setCourses] = useState(DUMMY_COURSES);

    // Search, Filtering, and Sorting State (all client-side)
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [sortLabel, setSortLabel] = useState(DEFAULT_SORT.label);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

    // Modal Control States
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Toast State
    const [toast, setToast] = useState(null);

    // Deleting Data State
    const [courseToDelete, setCourseToDelete] = useState(null);

    const showToast = (type, title, description) => {
        setToast({ type, title, description });
        setTimeout(() => setToast(null), 5000);
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

    // Confirm and execute delete — local state CRUD for now; the
    // setTimeout becomes router.delete once the backend exists.
    const confirmDelete = () => {
        if (!courseToDelete) return;

        setCourses((prev) =>
            prev.filter((course) => course.id !== courseToDelete.id),
        );

        setIsDeleteOpen(false);
        setCourseToDelete(null);
        showToast('success', 'Course successfully deleted!');

        // Clamp the current page if the last item on it was removed
        const remainingFiltered = filteredCourses.length - 1;
        const maxPage = Math.max(1, Math.ceil(remainingFiltered / pageSize));
        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }
    };

    // Stage 1 = filter the courses
    const filteredCourses = useMemo(() => {
        const query = searchQuery.toLowerCase();

        return courses.filter((course) => {
            // Search match
            const matchesSearch =
                query === '' ||
                course.title.toLowerCase().includes(query) ||
                course.description.toLowerCase().includes(query);

            // Category match
            const matchesCategory =
                categoryFilter === 'All' || course.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [courses, searchQuery, categoryFilter]);

    // Stage 2 = Sort the Courses
    const sortedCourses = useMemo(() => {
        const sort =
            SORT_OPTIONS.find((option) => option.label === sortLabel) ??
            DEFAULT_SORT;

        return orderBy(
            filteredCourses,
            [
                (course) =>
                    typeof course[sort.field] === 'string'
                        ? course[sort.field].toLowerCase()
                        : course[sort.field],
            ],
            [sort.direction],
        );
    }, [filteredCourses, sortLabel]);

    // Stage 3 = Paginate the Courses
    const paginatedCourses = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedCourses.slice(start, start + pageSize);
    }, [sortedCourses, currentPage, pageSize]);

    const totalPages = Math.max(1, Math.ceil(sortedCourses.length / pageSize));

    const showReset =
        searchQuery ||
        categoryFilter !== 'All' ||
        sortLabel !== DEFAULT_SORT.label;

    const formatDuration = (totalMinutes) => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const courseFilters = [
        {
            name: 'category',
            label: 'Category:',
            value: categoryFilter,
            onChange: (val) => handleFilterChange(setCategoryFilter, val),
            options: ['All', ...CATEGORIES],
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
        <>
            <div className="space-y-8">
                {/* ========== HEADER SECTION ========== */}
                <AdminHeader
                    title="Courses Management"
                    subtitle="Manage courses, modules, lessons and training topics."
                    label="Add Course"
                    icon={Plus}
                    onClick={() => {}}
                />

                {/* ========== FILTERS & CONTROLS ========== */}
                <SearchBar
                    value={searchQuery}
                    onChange={(val) => handleFilterChange(setSearchQuery, val)}
                    placeholder="Search courses by title or description..."
                    filters={courseFilters}
                    showReset={Boolean(showReset)}
                    onReset={handleResetFilters}
                />

                {/* ========== CARD GRID LAYOUT ========== */}
                <CardGrid
                    items={paginatedCourses}
                    renderItem={(course) => {
                        const config =
                            CATEGORY_MAP[course.category] ??
                            CATEGORY_MAP['Reading Comprehension'];
                        return (
                            <CourseCard
                                title={course.title}
                                description={course.description}
                                gradient={config.gradient}
                                icon={config.icon}
                                badgeText={course.category}
                                metaItems={[
                                    {
                                        icon: Clock,
                                        label: formatDuration(course.duration),
                                    },
                                    {
                                        icon: BookOpen,
                                        label: `${course.modules} Modules`,
                                    },
                                    {
                                        icon: Star,
                                        label: `${course.points} pts`,
                                    },
                                ]}
                                onEdit={() => {}}
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
                        currentPage={currentPage}
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
                    isSubmitting={false}
                />
            </div>

            {/* ========== TOAST NOTIFICATION ========== */}
            <Toast
                open={Boolean(toast)}
                onOpenChange={(open) => !open && setToast(null)}
                title={toast?.title}
                description={toast?.description}
                type={toast?.type}
            />
        </>
    );
}

Courses.layout = (page) => <AdminLayout>{page}</AdminLayout>;
