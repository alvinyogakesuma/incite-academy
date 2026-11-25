import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertDialog, Progress } from 'radix-ui';
import { Check, ChevronLeft, Trophy, XCircle } from 'lucide-react';
import StudentCourseRoomLayout from '@/components/StudentCourseRoomLayout';
import RichTextContent from '@/components/RichTextContent';
import StudentLayout from '@/layout/StudentLayout';
import {
    checkAnswerLabel,
    exitActionFor,
    mapQuizQuestions,
    pointsPerQuestion,
    progressPercentFor,
    resultHeadline,
    submitPayload,
} from '../RoomQuiz/quizRoom';

/**
 * The quiz take screen — an instant-feedback wizard. The client
 * checks each answer against the shipped correctness flags while
 * the finished attempt's selected answer ids go to the server,
 * which scores authoritatively, logs the attempt, and flashes the
 * result back for the completion screen. Ported from the
 * deprecated app's CourseRoomQuizStart on the current design
 * tokens, with the exit confirm on the app's AlertDialog and the
 * progress bar on Radix Progress.
 */
export default function RoomQuizStart({
    course,
    lesson,
    questions,
    sections,
    result = null,
}) {
    const boardingUrl = `/courses/${course.slug}/lessons/${lesson.id}`;

    const mappedQuestions = useMemo(
        () => mapQuizQuestions(questions),
        [questions],
    );

    const [currentIdx, setCurrentIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [checkedAnswers, setCheckedAnswers] = useState({});
    const [correctCount, setCorrectCount] = useState(0);
    const [showExitModal, setShowExitModal] = useState(false);

    const totalQuestions = mappedQuestions.length;
    const currentQuestion = mappedQuestions[currentIdx];

    // ── The completion screen — the exam-style result card with
    // the course outline still beside it, scored authoritatively
    // by the submit endpoint and flashed back.
    if (result) {
        return (
            <StudentCourseRoomLayout
                course={course}
                sections={sections}
                activeLessonId={lesson.id}
                isCompleted
                backUrl={boardingUrl}
                backText="Return to Boarding"
                hideDefaultActions
            >
                <div className="font-inter space-y-8 py-6 text-center">
                    <div className="flex justify-center">
                        <div className="flex size-24 items-center justify-center rounded-full bg-emerald-50 p-6 text-emerald-500 shadow-inner">
                            <Trophy className="size-12 stroke-[2]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-caption text-primary-700 font-inter font-bold tracking-widest uppercase">
                            Quiz Completed
                        </span>
                        <h1 className="font-poppins text-title-lg font-bold text-neutral-950">
                            {resultHeadline(result.percentage)}
                        </h1>
                        <p className="font-inter text-body-sm mx-auto max-w-md leading-relaxed text-neutral-500">
                            You correctly answered{' '}
                            <span className="font-semibold text-neutral-950">
                                {result.correct_count}
                            </span>{' '}
                            out of{' '}
                            <span className="font-semibold text-neutral-950">
                                {result.total_questions}
                            </span>{' '}
                            questions in the{' '}
                            <span className="font-semibold text-neutral-950">
                                {lesson.title}
                            </span>
                            .
                        </p>
                    </div>

                    <div className="bg-primary-50 border-primary-700/10 mx-auto flex max-w-xs items-center justify-around gap-4 rounded-2xl border p-5 shadow-sm">
                        <div className="text-center">
                            <p className="text-caption mb-0.5 font-semibold tracking-wider text-neutral-500 uppercase">
                                Accuracy
                            </p>
                            <p className="font-poppins text-body-lg text-primary-700 font-extrabold">
                                {result.percentage}%
                            </p>
                        </div>
                        <div className="bg-primary-700/10 h-8 w-px" />
                        <div className="text-center">
                            <p className="text-caption mb-0.5 font-semibold tracking-wider text-neutral-500 uppercase">
                                Points Gained
                            </p>
                            <p className="font-poppins text-body-lg font-extrabold text-emerald-600">
                                +{result.score} pts
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => router.visit(boardingUrl)}
                        className="bg-primary-700 shadow-primary-700/15 font-inter text-body-sm mx-auto block w-full max-w-sm cursor-pointer rounded-2xl py-4 font-bold tracking-wider text-white uppercase shadow-lg transition-all duration-150 hover:opacity-90 hover:shadow-xl active:scale-95"
                    >
                        Return to Boarding
                    </button>
                </div>
            </StudentCourseRoomLayout>
        );
    }

    // ── An empty quiz has nothing to take ────────────────────
    if (totalQuestions === 0) {
        return (
            <StudentCourseRoomLayout
                course={course}
                sections={sections}
                activeLessonId={lesson.id}
                backUrl={boardingUrl}
                backText="Back to Boarding"
                hideDefaultActions
            >
                <div className="font-inter space-y-8 py-6 text-center">
                    <p className="font-inter text-body-sm py-10 text-neutral-500">
                        This quiz has no questions yet.
                    </p>
                </div>
            </StudentCourseRoomLayout>
        );
    }

    const handleSelectOption = (option) => {
        if (checkedAnswers[currentIdx]) {
            return;
        }

        setUserAnswers((prev) => ({ ...prev, [currentIdx]: option }));
    };

    const selectedOption = userAnswers[currentIdx];
    const isAnswerChecked = checkedAnswers[currentIdx];

    const handleCheckAnswer = () => {
        if (!selectedOption) {
            return;
        }

        if (!isAnswerChecked) {
            if (selectedOption.isCorrect) {
                setCorrectCount((prev) => prev + 1);
            }

            setCheckedAnswers((prev) => ({ ...prev, [currentIdx]: true }));
        } else if (currentIdx < totalQuestions - 1) {
            setCurrentIdx((prev) => prev + 1);
        } else {
            // The finished attempt goes to the server — the
            // authoritative scoring comes back as the flashed
            // result.
            router.post(
                `/courses/${course.slug}/lessons/${lesson.id}/submit`,
                submitPayload(mappedQuestions, userAnswers),
            );
        }
    };

    const handlePrevious = () => {
        const action = exitActionFor(currentIdx);

        if (action.type === 'previous') {
            setCurrentIdx((prev) => prev - 1);
        } else {
            setShowExitModal(true);
        }
    };

    const progressPercent = progressPercentFor(currentIdx, totalQuestions);
    const pointsPerQuestionValue = pointsPerQuestion(
        lesson.points,
        totalQuestions,
    );

    return (
        <StudentCourseRoomLayout
            course={course}
            sections={sections}
            activeLessonId={lesson.id}
            backUrl={boardingUrl}
            backText="Exit Practice"
            onBack={() => setShowExitModal(true)}
            hideDefaultActions
        >
            <div className="font-inter space-y-8 py-2">
                <div className="space-y-6">
                    <h1 className="font-poppins text-title-lg leading-tight font-bold text-neutral-950">
                        {lesson.title}
                    </h1>

                    <div className="space-y-2">
                        <div className="font-inter text-body-sm flex items-center justify-between font-semibold text-neutral-500">
                            <span>
                                Question {currentIdx + 1} of {totalQuestions}
                            </span>
                            <span>
                                Score:{' '}
                                {Math.round(
                                    correctCount * pointsPerQuestionValue,
                                )}
                                /{lesson.points}
                            </span>
                        </div>
                        <Progress.Root
                            value={progressPercent}
                            className="bg-primary-50 relative h-2.5 w-full overflow-hidden rounded-full border border-neutral-950/5"
                        >
                            <Progress.Indicator
                                className="bg-primary-700 h-full w-full transition-transform duration-300 ease-out"
                                style={{
                                    transform: `translateX(-${100 - progressPercent}%)`,
                                }}
                            />
                        </Progress.Root>
                    </div>

                    {currentQuestion.type === 'listening' &&
                        currentQuestion.audio_url && (
                            <audio controls className="w-full">
                                <source
                                    src={currentQuestion.audio_url}
                                    type="audio/mpeg"
                                />
                                Your browser does not support the audio element.
                            </audio>
                        )}

                    <RichTextContent
                        html={currentQuestion.question_content}
                        className="font-inter text-body-sm sm:text-body font-medium text-neutral-800"
                    />
                </div>

                <div className="space-y-4">
                    {currentQuestion.options.map((opt) => {
                        const isSelected = selectedOption?.key === opt.key;
                        const isCorrect = opt.isCorrect;

                        let containerClass =
                            'border-neutral-300 border bg-white hover:bg-neutral-50';
                        let radioIcon = (
                            <div className="size-4.5 shrink-0 rounded-full border border-neutral-300" />
                        );

                        if (isAnswerChecked) {
                            if (isCorrect) {
                                containerClass =
                                    'border-emerald-500 border-2 bg-emerald-50/50';
                                radioIcon = (
                                    <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                                        <Check className="size-3 stroke-[3.5] text-white" />
                                    </div>
                                );
                            } else if (isSelected) {
                                containerClass =
                                    'border-error-500 border-2 bg-error-50/50';
                                radioIcon = (
                                    <XCircle className="text-error-500 fill-error-50 size-4.5 shrink-0" />
                                );
                            }
                        } else if (isSelected) {
                            containerClass =
                                'border-primary-700 border-2 bg-primary-700/5';
                            radioIcon = (
                                <div className="border-primary-700 flex size-4.5 shrink-0 items-center justify-center rounded-full border-2">
                                    <div className="bg-primary-700 size-2 rounded-full" />
                                </div>
                            );
                        }

                        return (
                            <button
                                key={opt.key}
                                onClick={() => handleSelectOption(opt)}
                                disabled={isAnswerChecked}
                                className={`font-inter text-body-sm flex w-full cursor-pointer items-center gap-3 rounded-xl p-4.5 text-left text-neutral-800 transition-all duration-150 ${containerClass}`}
                            >
                                {radioIcon}
                                <span className="font-medium">{opt.text}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="font-inter mt-6 flex w-full items-center justify-between gap-4 border-t border-neutral-950/5 pt-6">
                    <button
                        onClick={handlePrevious}
                        className="border-primary-700 text-primary-700 hover:bg-primary-700/5 font-inter text-body-sm flex cursor-pointer items-center gap-1.5 rounded-xl border px-4.5 py-2.5 font-semibold transition-all duration-150"
                    >
                        <ChevronLeft className="size-4" />
                        <span>Previous</span>
                    </button>

                    <button
                        onClick={handleCheckAnswer}
                        disabled={!selectedOption}
                        className={`font-inter text-body-sm bg-primary-700 flex items-center justify-center rounded-xl px-6 py-2.5 font-semibold text-white transition-all duration-150 ${
                            selectedOption
                                ? 'hover:bg-primary-600 cursor-pointer active:scale-95'
                                : 'cursor-not-allowed opacity-50'
                        }`}
                    >
                        {checkAnswerLabel({
                            isAnswerChecked,
                            hasNext: currentIdx < totalQuestions - 1,
                        })}
                    </button>
                </div>
            </div>

            {/* Exit confirm — the app's destructive-confirm shape */}
            <AlertDialog.Root
                open={showExitModal}
                onOpenChange={setShowExitModal}
            >
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="animate-in fade-in fixed inset-0 z-50 bg-black/45 backdrop-blur-xs duration-150" />
                    <AlertDialog.Content className="animate-in fade-in zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-xl duration-150 outline-none">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="bg-error-50 text-error-500 rounded-full p-3">
                                <XCircle className="size-8" />
                            </div>
                            <div className="space-y-1.5">
                                <AlertDialog.Title className="font-poppins text-body-lg font-bold text-neutral-950">
                                    Exit Practice?
                                </AlertDialog.Title>
                                <AlertDialog.Description className="font-inter text-body-sm leading-relaxed text-neutral-500">
                                    Are you sure you want to exit the practice?
                                    Any unsaved progress will be lost.
                                </AlertDialog.Description>
                            </div>
                            <div className="flex w-full items-center gap-3 pt-2">
                                <AlertDialog.Cancel asChild>
                                    <button className="font-inter text-body-sm flex-1 cursor-pointer rounded-xl border border-neutral-200 bg-transparent py-2.5 font-semibold tracking-wider text-neutral-700 uppercase transition duration-150 outline-none hover:bg-neutral-50">
                                        Cancel
                                    </button>
                                </AlertDialog.Cancel>
                                <AlertDialog.Action asChild>
                                    <button
                                        onClick={() =>
                                            router.visit(boardingUrl)
                                        }
                                        className="bg-error-500 hover:bg-error-600 font-inter text-body-sm flex-1 cursor-pointer rounded-xl border-0 py-2.5 font-bold tracking-wider text-white uppercase transition duration-150 outline-none"
                                    >
                                        Exit
                                    </button>
                                </AlertDialog.Action>
                            </div>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </StudentCourseRoomLayout>
    );
}

RoomQuizStart.layout = (page) => <StudentLayout>{page}</StudentLayout>;
