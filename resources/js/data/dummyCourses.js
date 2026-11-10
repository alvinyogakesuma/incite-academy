// Dummy course data for the Courses Management page — local state for
// now, swapped for real props once the backend CRUD controller exists.
// Shape mirrors the backend CourseController map: id, title, description,
// category, duration (minutes), modules, points.
export const DUMMY_COURSES = [
    {
        id: 1,
        title: 'Reading Comprehension Mastery',
        description:
            'Develop critical reading skills for the ITERA reading section',
        category: 'Reading Comprehension',
        duration: 234,
        modules: 3,
        points: 160,
    },
    {
        id: 2,
        title: 'Advanced Listening Strategies',
        description:
            'Master speed-listening and note-taking for the listening assessment',
        category: 'Listening Comprehension',
        duration: 142,
        modules: 3,
        points: 140,
    },
    {
        id: 3,
        title: 'Grammar & Sentence Structure',
        description:
            'Deep dive into active/passive voice, conditional clauses, and complex tenses',
        category: 'Structure and Writing Expression',
        duration: 105,
        modules: 2,
        points: 95,
    },
    {
        id: 4,
        title: 'Vocabulary in Context',
        description:
            'Build academic word power and learn to infer meaning from context clues',
        category: 'Reading Comprehension',
        duration: 180,
        modules: 4,
        points: 120,
    },
    {
        id: 5,
        title: 'Lecture Note-Taking Lab',
        description:
            'Practice structured note-taking while listening to academic lectures',
        category: 'Listening Comprehension',
        duration: 96,
        modules: 2,
        points: 85,
    },
    {
        id: 6,
        title: 'Written Expression Workshop',
        description:
            'Sharpen error identification and sentence correction under exam pressure',
        category: 'Structure and Writing Expression',
        duration: 150,
        modules: 3,
        points: 110,
    },
    {
        id: 7,
        title: 'Skimming & Scanning Techniques',
        description:
            'Read faster without losing comprehension using proven timing strategies',
        category: 'Reading Comprehension',
        duration: 75,
        modules: 1,
        points: 60,
    },
    {
        id: 8,
        title: 'Conversational English Drills',
        description:
            'Train your ear for everyday dialogues, idioms, and speaker attitudes',
        category: 'Listening Comprehension',
        duration: 120,
        modules: 2,
        points: 90,
    },
];
