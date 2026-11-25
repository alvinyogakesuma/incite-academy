import { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Clock, Compass, RotateCcw, Swords, Users } from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import StudentHero from '@/components/StudentHero';
import StudentChallengeCard from '@/components/StudentChallengeCard';
import StudentFiltersSidebar from '@/components/StudentFiltersSidebar';
import {
    seedCategories,
    sortCourses,
    toggleCategory,
} from '@/Pages/Courses/courseCatalog';
import { SORT_OPTIONS, filterChallenges } from './challengeCatalog';

const HERO_IMAGE = '/images/challenges_explorer_image.png';

/**
 * Challenges — the student-facing catalog of timed challenges.
 * Ported from the deprecated app's Challenges page onto the
 * current catalog conventions: the hero, the filter sidebar
 * (search, categories, sort), and the card grid.
 */
export default function Challenges({ challenges = [], categories = [] }) {
    const [searchQuery, setSearchQuery] = useState('');

    // A ?category= deep link (the footer's columns) seeds the
    // category filter on arrival.
    const [selectedCategories, setSelectedCategories] = useState(() => {
        const category = new URLSearchParams(window.location.search).get(
            'category',
        );

        return seedCategories(category);
    });

    const [sortBy, setSortBy] = useState('title-asc');

    const handleCategoryToggle = (category) => {
        setSelectedCategories((prev) => toggleCategory(prev, category));
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedCategories([]);
        setSortBy('title-asc');
    };

    const filteredAndSortedChallenges = useMemo(() => {
        const filtered = filterChallenges(challenges, {
            searchQuery,
            selectedCategories,
        });

        return sortCourses(filtered, sortBy);
    }, [challenges, searchQuery, selectedCategories, sortBy]);

    return (
        <>
            <Head title="Challenges" />

            {/* ========== HERO SECTION ========== */}
            <StudentHero
                title="Challenges"
                description="Test your skills, compete with others, and earn points."
                stats={[
                    {
                        label: 'Challenges',
                        value: challenges.length,
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

            {/* ========== CHALLENGES CONTENT ========== */}
            <section className="bg-primary-50/40">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 md:py-10">
                    <div className="flex flex-col gap-4 md:gap-6 lg:flex-row">
                        {/* Sidebar Filters */}
                        <StudentFiltersSidebar
                            searchLabel="Search Challenges"
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
                        />

                        {/* Main Content */}
                        <div className="min-w-0 flex-1">
                            {filteredAndSortedChallenges.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
                                    {filteredAndSortedChallenges.map(
                                        (challenge) => (
                                            <StudentChallengeCard
                                                key={challenge.id}
                                                challenge={challenge}
                                            />
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-neutral-950/5 bg-white p-16 text-center shadow-sm">
                                    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 text-neutral-500">
                                        <div className="text-primary-700/60 bg-primary-50 rounded-full p-4">
                                            <Swords className="size-8 animate-pulse" />
                                        </div>
                                        <h3 className="font-poppins text-body font-bold text-neutral-950">
                                            No Challenges Found
                                        </h3>
                                        <p className="font-inter text-caption leading-relaxed text-neutral-500">
                                            No challenges match your current
                                            search criteria or category filters.
                                            Try adjusting your filters to
                                            discover more challenges.
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

Challenges.layout = (page) => <StudentLayout>{page}</StudentLayout>;
