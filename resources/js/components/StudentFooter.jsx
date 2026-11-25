import { Link } from '@inertiajs/react';
import Logomark from './Logomark';
import Logotype from './Logotype';

// The footer's link columns — the catalog's categories and the
// paths' levels deep-link their listings' filters; the challenge
// categories land on their listing.
const COLUMNS = [
    {
        heading: 'Courses',
        links: [
            {
                label: 'Reading Comprehension',
                href: '/courses?category=Reading+Comprehension',
            },
            {
                label: 'Listening Comprehension',
                href: '/courses?category=Listening+Comprehension',
            },
            {
                label: 'Structure and Writing Expression',
                href: '/courses?category=Structure+and+Writing+Expression',
            },
        ],
    },
    {
        heading: 'Learning Paths',
        links: [
            { label: 'Beginner', href: '/learning-paths?level=Beginner' },
            {
                label: 'Intermediate',
                href: '/learning-paths?level=Intermediate',
            },
            { label: 'Advanced', href: '/learning-paths?level=Advanced' },
            {
                label: 'All Levels',
                href: '/learning-paths?level=All+Levels',
            },
        ],
    },
    {
        heading: 'Challenges',
        links: [
            { label: 'Reading Comprehension', href: '/challenges' },
            { label: 'Listening Comprehension', href: '/challenges' },
            {
                label: 'Structure and Writing Expression',
                href: '/challenges',
            },
            { label: 'Leaderboard', href: '/leaderboard' },
        ],
    },
];

/**
 * Student footer — the brand band below the student pages: the
 * INCITE mark with its blurb, the three section columns carrying
 * the catalog's categories and the paths' levels, and the
 * copyright line. Ported from the deprecated app's StudentFooter
 * with the columns restructured to the app's sections.
 */
export default function StudentFooter() {
    return (
        <footer className="border-primary-800/60 bg-primary-950 border-t">
            <div className="mx-auto max-w-6xl px-4 sm:px-8">
                <div className="grid grid-cols-1 gap-6 pt-8 pb-5 sm:pt-10 sm:pb-6 lg:grid-cols-12 lg:gap-10">
                    {/* Brand block */}
                    <div className="flex max-w-xs flex-col gap-2 lg:col-span-4">
                        <Link
                            href="/courses"
                            className="focus-visible:outline-secondary-300 inline-flex w-fit items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <Logomark />
                            <Logotype tone="dark" />
                        </Link>
                        <p className="font-inter text-body-sm text-primary-100/75 leading-relaxed">
                            Empower learners worldwide through quality,
                            structured English learning paths and assessments.
                        </p>
                    </div>

                    {/* Link columns */}
                    <nav
                        aria-label="Footer navigation"
                        className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8 lg:col-span-8"
                    >
                        {COLUMNS.map((column) => (
                            <div
                                key={column.heading}
                                className="flex flex-col gap-2.5"
                            >
                                <p className="font-poppins text-body-sm font-bold tracking-wider text-white uppercase">
                                    {column.heading}
                                </p>
                                <ul className="flex flex-col gap-1.5">
                                    {column.links.map((link) => (
                                        <li key={link.label}>
                                            <Link
                                                href={link.href}
                                                className="font-inter text-body-sm text-primary-100/80 focus-visible:outline-secondary-300 inline-block rounded-sm font-medium transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Copyright band */}
                <div className="border-primary-800/50 flex items-center justify-center border-t py-3">
                    <p className="font-inter text-primary-200/65 text-xs">
                        &copy; {new Date().getFullYear()} INCITE Academy. All
                        rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
