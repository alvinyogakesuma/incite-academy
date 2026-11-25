import { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { BookOpen, Clock, RotateCcw, Users } from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import StudentHero from '@/components/StudentHero';
import StudentCourseCard from '@/components/StudentCourseCard';
import StudentFiltersSidebar from '@/components/StudentFiltersSidebar';
import {
    SORT_OPTIONS,
    filterCourses,
    seedCategories,
    sortCourses,
    toggleCategory,
} from './courseCatalog';

const HERO_IMAGE = '/images/courses_explorer_image.png';

/**
 * Explore Courses — the student-facing catalog of published
 * courses. Search, sort, category, and progress filtering run
 * client-side over the server-provided list; the cards' start
 * action stays inert until the course room routes exist.
 */
export default function Courses({ courses, categories }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('title-asc');
    // A ?category= deep link (the footer's columns) seeds the
    // catalog's category filter on arrival.
    const [selectedCategories, setSelectedCategories] = useState(() => {
        const category = new URLSearchParams(window.location.search).get(
            'category',
        );

        return seedCategories(category);
    });
    const [progressFilter, setProgressFilter] = useState('all');

    const handleCategoryToggle = (category) => {
        setSelectedCategories((prev) => toggleCategory(prev, category));
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSortBy('title-asc');
        setSelectedCategories([]);
        setProgressFilter('all');
    };

    const filteredAndSortedCourses = useMemo(() => {
        const filtered = filterCourses(courses, {
            searchQuery,
            selectedCategories,
            progressFilter,
        });

        return sortCourses(filtered, sortBy);
    }, [courses, searchQuery, sortBy, selectedCategories, progressFilter]);

    return (
        <>
            <Head title="Explore Courses" />

            {/* ========== HERO SECTION ========== */}
            <StudentHero
                title="Explore Courses"
                description="Master every aspect of the ITERA English proficiency test with our comprehensive course catalog"
                stats={[
                    {
                        label: 'Courses',
                        value: courses.length,
                        icon: BookOpen,
                        color: 'brand',
                    },
                    {
                        label: 'Students',
                        value: '20,000+',
                        icon: Users,
                        color: 'blue',
                    },
                    {
                        label: 'Learning',
                        value: 'Self-paced',
                        icon: Clock,
                        color: 'amber',
                    },
                ]}
                image={HERO_IMAGE}
            />

            {/* ========== COURSES CONTENT ========== */}
            <section className="bg-primary-50/40">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 md:py-10">
                    <div className="flex flex-col gap-4 md:gap-6 lg:flex-row">
                        {/* Sidebar Filters */}
                        <StudentFiltersSidebar
                            searchLabel="Search Courses"
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            sortOptions={SORT_OPTIONS}
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                            filterGroups={[
                                {
                                    title: 'Category',
                                    options: categories,
                                    selected: selectedCategories,
                                    onToggle: handleCategoryToggle,
                                },
                            ]}
                            progressFilter={progressFilter}
                            onProgressChange={setProgressFilter}
                        />

                        {/* Main Content */}
                        <div className="min-w-0 flex-1">
                            {/* Course Cards Grid */}
                            {filteredAndSortedCourses.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
                                    {filteredAndSortedCourses.map((course) => (
                                        <StudentCourseCard
                                            key={course.id}
                                            course={course}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-neutral-950/5 bg-white p-16 text-center shadow-sm">
                                    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 text-neutral-500">
                                        <div className="text-primary-700/60 bg-primary-50 rounded-full p-4">
                                            <BookOpen className="size-8 animate-pulse" />
                                        </div>
                                        <h3 className="font-poppins text-body font-bold text-neutral-950">
                                            No Courses Found
                                        </h3>
                                        <p className="font-inter text-caption leading-relaxed text-neutral-500">
                                            No courses match your current search
                                            criteria or category filters. Try
                                            adjusting your filters to discover
                                            more courses.
                                        </p>
                                        <button
                                            onClick={handleResetFilters}
                                            className="text-caption text-primary-700 mt-2 flex cursor-pointer items-center gap-1 font-bold hover:underline"
                                        >
                                            <RotateCcw className="size-3" />
                                            <span>Reset Filter Options</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

Courses.layout = (page) => <StudentLayout>{page}</StudentLayout>;
