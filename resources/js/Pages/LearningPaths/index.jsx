import { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Clock, Compass, RotateCcw, Users } from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import StudentHero from '@/components/StudentHero';
import StudentLearningPathCard from '@/components/StudentLearningPathCard';
import StudentFiltersSidebar from '@/components/StudentFiltersSidebar';
import {
    seedCategories,
    sortCourses,
    toggleCategory,
} from '@/Pages/Courses/courseCatalog';
import { SORT_OPTIONS, filterLearningPaths } from './learningPathCatalog';

const HERO_IMAGE = '/images/learning_paths_explorer_image.png';

/**
 * Learning Paths — the student-facing catalog of structured
 * learning journeys. Ported from the deprecated app's Learning
 * Paths page onto the current catalog conventions: the hero, the
 * filter sidebar (search, levels, sort), and the card grid. The
 * pipeline reuses the covered courseCatalog helpers (the value-
 * generic deep-link seed, toggle, and comparator); the page's
 * own filter lives in learningPathCatalog.js.
 */
export default function LearningPaths({ learningPaths = [], levels = [] }) {
    const [searchQuery, setSearchQuery] = useState('');

    // A ?level= deep link (the footer's columns) seeds the level
    // filter on arrival.
    const [selectedLevels, setSelectedLevels] = useState(() => {
        const level = new URLSearchParams(window.location.search).get('level');

        return seedCategories(level);
    });

    const [sortBy, setSortBy] = useState('title-asc');

    const handleLevelToggle = (level) => {
        setSelectedLevels((prev) => toggleCategory(prev, level));
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedLevels([]);
        setSortBy('title-asc');
    };

    // Stage 1 = filter the paths; Stage 2 = sort by the selected
    // field-direction pair (the comparator copies, so the props
    // list is never mutated).
    const filteredAndSortedPaths = useMemo(
        () =>
            sortCourses(
                filterLearningPaths(learningPaths, {
                    searchQuery,
                    selectedLevels,
                }),
                sortBy,
            ),
        [learningPaths, searchQuery, selectedLevels, sortBy],
    );

    return (
        <>
            <Head title="Learning Paths" />

            {/* ========== HERO SECTION ========== */}
            <StudentHero
                title="Learning Paths"
                description="Structured learning journeys to guide you to succeed in your English test"
                stats={[
                    {
                        label: 'Paths',
                        value: learningPaths.length,
                        icon: Compass,
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

            {/* ========== PATHS CONTENT ========== */}
            <section className="bg-primary-50/40">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 md:py-10">
                    <div className="flex flex-col gap-4 md:gap-6 lg:flex-row">
                        {/* Sidebar Filters */}
                        <StudentFiltersSidebar
                            searchLabel="Search Learning Paths"
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            sortOptions={SORT_OPTIONS}
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                            filterGroups={[
                                {
                                    title: 'Level',
                                    options: levels,
                                    selected: selectedLevels,
                                    onToggle: handleLevelToggle,
                                },
                            ]}
                        />

                        {/* Main Content */}
                        <div className="min-w-0 flex-1">
                            {filteredAndSortedPaths.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
                                    {filteredAndSortedPaths.map((path) => (
                                        <StudentLearningPathCard
                                            key={path.id}
                                            path={path}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-neutral-950/5 bg-white p-16 text-center shadow-sm">
                                    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 text-neutral-500">
                                        <div className="text-primary-700/60 bg-primary-50 rounded-full p-4">
                                            <Compass className="size-8 animate-pulse" />
                                        </div>
                                        <h3 className="font-poppins text-body font-bold text-neutral-950">
                                            No Learning Paths Found
                                        </h3>
                                        <p className="font-inter text-caption leading-relaxed text-neutral-500">
                                            No learning paths match your current
                                            search criteria or level filters.
                                            Try adjusting your filters to
                                            discover more paths.
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

LearningPaths.layout = (page) => <StudentLayout>{page}</StudentLayout>;
