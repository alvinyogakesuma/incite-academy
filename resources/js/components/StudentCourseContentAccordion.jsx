import { useMemo } from 'react';
import { Accordion } from 'radix-ui';
import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    FileText,
    Folder,
    Hourglass,
    Pencil,
    Play,
} from 'lucide-react';
import { formatDuration } from '@/Pages/Dashboard/Courses/courseTable';
import {
    defaultOpenSection,
    lessonIconTag,
    sectionLessonsCount,
} from '@/Pages/Courses/Detail/courseDetail';

/**
 * Course Content — the module/lesson outline as a Radix accordion.
 * Lesson rows navigate through the optional onLessonClick
 * handler; without one they render inert. The active lesson is
 * highlighted via activeLessonId. Ported from the deprecated
 * app's CourseContentAccordion on the current design tokens.
 */
export default function StudentCourseContentAccordion({
    sections = [],
    activeLessonId = null,
    onLessonClick = null,
}) {
    // Map the lesson's icon tag to its glyph — articles read,
    // quizzes write, exams are timed, completed rows check off.
    const getLessonIcon = (lesson, isActive) => {
        const tag = lessonIconTag(lesson);

        if (tag === 'completed') {
            return (
                <div className="shrink-0 rounded-lg border border-emerald-100 bg-emerald-50 p-1 text-emerald-600">
                    <CheckCircle2 className="size-4" />
                </div>
            );
        }

        let Icon = FileText;
        let bgClass = isActive
            ? 'border-primary-700/20 bg-primary-700/10 text-primary-700'
            : 'border-blue-100 bg-blue-50/50 text-blue-600';

        if (tag === 'quiz') {
            Icon = Pencil;
            bgClass = isActive
                ? 'border-primary-700/20 bg-primary-700/10 text-primary-700'
                : 'border-amber-100 bg-amber-50/50 text-amber-600';
        } else if (tag === 'exam') {
            Icon = Hourglass;
            bgClass = isActive
                ? 'border-primary-700/20 bg-primary-700/10 text-primary-700'
                : 'border-rose-100 bg-rose-50/50 text-rose-600';
        }

        return (
            <div className={`shrink-0 rounded-lg border p-1.5 ${bgClass}`}>
                <Icon className="size-3.5" />
            </div>
        );
    };

    // Open the section holding the active lesson, or the first.
    const defaultOpen = useMemo(
        () => defaultOpenSection(sections, activeLessonId),
        [sections, activeLessonId],
    );

    return (
        <div className="flex w-full flex-col gap-6 rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-sm md:p-8">
            {/* Header */}
            <div>
                <h2 className="font-poppins text-body-lg font-bold text-neutral-950">
                    Course Content
                </h2>
            </div>

            {/* Radix Accordion */}
            <Accordion.Root
                type="single"
                collapsible
                defaultValue={defaultOpen}
                key={defaultOpen}
                className="flex w-full flex-col gap-3"
            >
                {sections.map((section) => {
                    const sectionId = `section-${section.id}`;
                    const lessonsCount = sectionLessonsCount(section);

                    return (
                        <Accordion.Item
                            key={section.id}
                            value={sectionId}
                            className="hover:border-primary-700/10 bg-primary-50 overflow-hidden rounded-xl border border-neutral-950/5 shadow-sm transition-colors duration-200"
                        >
                            <Accordion.Header className="flex">
                                <Accordion.Trigger className="group hover:bg-primary-50/30 flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-all duration-200">
                                    <div className="flex min-w-0 items-center gap-4">
                                        <div className="border-primary-700/10 bg-primary-700/5 text-primary-700 group-hover:bg-primary-700 shrink-0 rounded-xl border p-2 transition-all duration-200 group-hover:text-white">
                                            <Folder className="size-4.5" />
                                        </div>
                                        <div className="font-inter">
                                            <p className="font-poppins text-body-sm group-hover:text-primary-700 font-bold text-neutral-950 transition-colors duration-200">
                                                {section.title}
                                            </p>
                                            <p className="text-caption text-primary-700 mt-0.5 flex items-center gap-1.5 font-medium">
                                                <span>
                                                    {lessonsCount} lessons
                                                </span>
                                                <span className="opacity-40">
                                                    •
                                                </span>
                                                <span>
                                                    {formatDuration(
                                                        section.duration,
                                                    )}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronDown className="size-4 text-neutral-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                </Accordion.Trigger>
                            </Accordion.Header>

                            <Accordion.Content className="overflow-hidden border-t border-neutral-950/5">
                                <div className="flex flex-col gap-2.5 px-5 pt-3 pb-5">
                                    {section.lessons &&
                                    section.lessons.length > 0 ? (
                                        section.lessons.map((lesson) => {
                                            const isActive =
                                                Number(lesson.id) ===
                                                Number(activeLessonId);

                                            return (
                                                <div
                                                    key={lesson.id}
                                                    onClick={
                                                        onLessonClick
                                                            ? () =>
                                                                  onLessonClick(
                                                                      lesson,
                                                                  )
                                                            : undefined
                                                    }
                                                    className={`hover:shadow-primary-700/5 group/lesson hover:border-primary-700/30 flex items-center justify-between rounded-xl border p-3 transition-all duration-200 hover:shadow-sm ${
                                                        isActive
                                                            ? 'border-primary-700 bg-primary-700/5 text-primary-700 shadow-primary-700/5 shadow-sm'
                                                            : 'border-neutral-950/5 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex min-w-0 items-center gap-3.5">
                                                        {getLessonIcon(
                                                            lesson,
                                                            isActive,
                                                        )}
                                                        <div className="font-inter">
                                                            <p
                                                                className={`text-body-sm transition-colors duration-150 ${
                                                                    isActive
                                                                        ? 'text-primary-700 font-bold'
                                                                        : 'group-hover/lesson:text-primary-700 font-medium text-neutral-950'
                                                                }`}
                                                            >
                                                                {lesson.title}
                                                            </p>
                                                            <p
                                                                className={`text-caption mt-0.5 font-normal ${
                                                                    isActive
                                                                        ? 'text-primary-700/70'
                                                                        : 'text-neutral-500'
                                                                }`}
                                                            >
                                                                {formatDuration(
                                                                    lesson.duration,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`group-hover/lesson:border-primary-700 group-hover/lesson:bg-primary-700 flex size-7 items-center justify-center rounded-full border transition-all duration-200 group-hover/lesson:text-white ${
                                                            isActive
                                                                ? 'border-primary-700 bg-primary-700 text-white'
                                                                : 'border-neutral-950/5 bg-neutral-50 text-neutral-500'
                                                        }`}
                                                    >
                                                        {lesson.completed ? (
                                                            <ChevronRight className="size-3.5 transition-transform group-hover/lesson:translate-x-0.5" />
                                                        ) : (
                                                            <Play className="size-3 fill-current transition-transform group-hover/lesson:translate-x-0.5" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="font-inter text-body-sm py-4 text-center text-neutral-500">
                                            No lessons available in this
                                            section.
                                        </p>
                                    )}
                                </div>
                            </Accordion.Content>
                        </Accordion.Item>
                    );
                })}
            </Accordion.Root>
        </div>
    );
}
