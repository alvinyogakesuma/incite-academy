import { router } from '@inertiajs/react';
import StudentCourseRoomLayout from '@/components/StudentCourseRoomLayout';
import StudentLayout from '@/layout/StudentLayout';
import { articleBodyFor } from './lessonRoom';

/**
 * The student lesson room for article lessons — the lesson body
 * beside the course outline, with Mark as Reviewed completing the
 * lesson. Quiz and exam rooms arrive with their own ports; until
 * then their lessons show the prepared-content placeholder.
 * Ported from the deprecated app's CourseRoom on the current
 * design tokens.
 */
export default function Room({ course, lesson, sections, completed }) {
    const handleComplete = () => {
        if (completed) {
            return;
        }

        router.post(
            `/courses/${course.slug}/lessons/${lesson.id}/complete`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <StudentCourseRoomLayout
            course={course}
            sections={sections}
            activeLessonId={lesson.id}
            onComplete={handleComplete}
            isCompleted={completed}
            backUrl={`/courses/${course.slug}`}
            backText="Back to Course"
        >
            <div
                className="lesson-article font-inter text-body-sm sm:text-body text-justify text-neutral-800"
                dangerouslySetInnerHTML={{
                    __html: articleBodyFor(lesson),
                }}
            />
        </StudentCourseRoomLayout>
    );
}

Room.layout = (page) => <StudentLayout>{page}</StudentLayout>;
