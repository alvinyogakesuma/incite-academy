import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AlertDialog, Progress } from 'radix-ui';
import {
    AlertTriangle,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Timer,
    Trophy,
} from 'lucide-react';
import StudentLayout from '@/layout/StudentLayout';
import RichTextContent from '@/components/RichTextContent';
import {
    answeredCountIn,
    examProgressPercent,
    examSubmitAnswers,
    formatClock,
    mapExamQuestions,
    navigatorCellState,
    tickTimeLeft,
} from '@/Pages/Courses/RoomExam/examRoom';
import { resultHeadline } from '@/Pages/Courses/RoomQuiz/quizRoom';
import { challengeDurationSeconds } from './challengeRoom';

/**
 * The timed challenge take screen — the exam take screen's twin
 * without the course outline: a dedicated timer bar, the question
 * card beside the aspect-square navigator grid, selections going
 * by answer id, the countdown auto-submitting at zero, and the
 * server's flashed score rendering the standalone result card.
 * Challenges never receive the answer key — only the server
 * scores. Ported from the deprecated app's ChallengeRoom on the
 * current design tokens with the app's AlertDialog and Radix
 * Progress.
 */
export default function Room({ challenge, questions, result = null }) {
    const boardingUrl = `/challenges/${challenge.id}`;

    const mappedQuestions = useMemo(
        () => mapExamQuestions(questions),
        [questions],
    );

    const totalQuestions = mappedQuestions.length;

    const [currentIdx, setCurrentIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showExitModal, setShowExitModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(() =>
        challengeDurationSeconds(challenge.duration),
    );

    const answersRef = useRef(userAnswers);
    answersRef.current = userAnswers;

    const handleSelectOption = (answerId) => {
        setUserAnswers((prev) => ({ ...prev, [currentIdx]: answerId }));
    };

    const selectedAnswerId = userAnswers[currentIdx];

    const answeredCount = useMemo(
        () => answeredCountIn(userAnswers),
        [userAnswers],
    );

    const handlePrevious = () => {
        if (currentIdx > 0) {
            setCurrentIdx((prev) => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentIdx < totalQuestions - 1) {
            setCurrentIdx((prev) => prev + 1);
        }
    };

    const handleSubmitChallenge = useCallback(() => {
        router.post(`/challenges/${challenge.id}/submit`, {
            answers: examSubmitAnswers(mappedQuestions, answersRef.current),
        });
    }, [mappedQuestions, challenge.id]);

    useEffect(() => {
        // The result screen needs no ticking clock.
        if (result) {
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const next = tickTimeLeft(prev);

                if (next === 0) {
                    clearInterval(timer);
                    handleSubmitChallenge();
                }

                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [result, handleSubmitChallenge]);

    const progressPercent = examProgressPercent(answeredCount, totalQuestions);

    // ── The result card — the server's authoritative scoring of
    // the submitted answers, flashed back from the submit
    // endpoint, standing alone: a challenge has no course outline
    // to sit beside.
    if (result) {
        return (
            <div className="bg-primary-50/40 font-inter flex min-h-screen flex-col">
                <Head title={`Challenge Completed - ${challenge.title}`} />
                <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                    <div className="animate-in fade-in zoom-in-95 w-full max-w-md space-y-8 rounded-3xl border border-neutral-950/5 bg-white p-8 text-center shadow-xl duration-200">
                        <div className="flex justify-center">
                            <div className="flex size-24 items-center justify-center rounded-full bg-emerald-50 p-6 text-emerald-500 shadow-inner">
                                <Trophy className="size-12 stroke-[2]" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-caption text-primary-700 font-inter font-bold tracking-widest uppercase">
                                Challenge Completed
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
                                    {challenge.title}
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
                </main>
            </div>
        );
    }

    // ── An empty challenge has nothing to take ────────────────
    if (totalQuestions === 0) {
        return (
            <div className="bg-primary-50/40 font-inter flex min-h-screen flex-col">
                <Head title={`${challenge.title} - Challenge Room`} />
                <main className="flex flex-1 items-center justify-center px-4 py-12">
                    <p className="font-inter text-body-sm text-center text-neutral-500">
                        This challenge has no questions yet.
                    </p>
                </main>
            </div>
        );
    }

    const currentQuestion = mappedQuestions[currentIdx];

    return (
        <div className="bg-primary-50/40 font-inter flex min-h-screen flex-col">
            <Head title={`Challenge Room - ${challenge.title}`} />

            {/* Timer bar */}
            <div className="border-b border-neutral-950/5 bg-white shadow-xs">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="group font-inter text-body-sm hover:text-primary-700 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-semibold text-neutral-500 transition-colors duration-150 outline-none"
                    >
                        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Exit Challenge</span>
                    </button>

                    <div className="bg-primary-50 border-primary-700/20 text-primary-700 font-inter text-body-sm flex animate-pulse items-center gap-2 rounded-lg border px-3 py-1.5 font-semibold">
                        <Timer className="size-4 shrink-0" />
                        <span>{formatClock(timeLeft)}</span>
                    </div>
                </div>
            </div>

            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                    {/* Question card */}
                    <div className="flex min-h-[480px] flex-col justify-between rounded-3xl border border-neutral-950/5 bg-white p-6 shadow-sm sm:p-8 lg:col-span-8">
                        <div className="space-y-6">
                            <h2 className="font-poppins text-title leading-snug font-bold text-neutral-950">
                                {challenge.title}
                            </h2>

                            <div className="space-y-2.5">
                                <div className="font-inter text-body-sm flex items-center justify-between font-semibold text-neutral-500">
                                    <span>
                                        Question {currentIdx + 1} of{' '}
                                        {totalQuestions}
                                    </span>
                                    <span>
                                        Progress: {answeredCount}/
                                        {totalQuestions} Answered
                                    </span>
                                </div>
                                <Progress.Root
                                    value={progressPercent}
                                    className="relative h-2 w-full overflow-hidden rounded-full border border-neutral-950/5 bg-neutral-100"
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
                                        Your browser does not support the audio
                                        element.
                                    </audio>
                                )}

                            <RichTextContent
                                html={currentQuestion.question_content}
                                className="font-inter text-body-sm sm:text-body pt-3 leading-relaxed font-medium text-neutral-800"
                            />

                            <div className="space-y-3 pt-2">
                                {currentQuestion.options.map((opt) => {
                                    const isSelected =
                                        selectedAnswerId === opt.id;

                                    let containerClass =
                                        'border-neutral-200 border bg-white hover:border-neutral-300 hover:bg-neutral-50/50';
                                    let radioIcon = (
                                        <div className="size-4 shrink-0 rounded-full border border-neutral-300" />
                                    );

                                    if (isSelected) {
                                        containerClass =
                                            'border-primary-700 border-2 bg-primary-700/5';
                                        radioIcon = (
                                            <div className="border-primary-700 bg-primary-700/5 flex size-4 shrink-0 items-center justify-center rounded-full border-2">
                                                <div className="bg-primary-700 size-1.5 rounded-full" />
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() =>
                                                handleSelectOption(opt.id)
                                            }
                                            className={`font-inter text-body-sm flex w-full cursor-pointer items-center gap-3.5 rounded-xl p-4 text-left text-neutral-700 transition-all duration-150 ${containerClass}`}
                                        >
                                            {radioIcon}
                                            <span className="font-medium">
                                                {opt.text}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between gap-4 border-t border-neutral-950/5 pt-6">
                            <button
                                onClick={handlePrevious}
                                disabled={currentIdx === 0}
                                className={`border-primary-700 text-primary-700 font-inter text-body-sm flex items-center gap-1 rounded-xl border px-4 py-2 font-semibold transition-all duration-150 ${
                                    currentIdx === 0
                                        ? 'cursor-not-allowed opacity-40'
                                        : 'hover:bg-primary-700/5 cursor-pointer'
                                }`}
                            >
                                <ChevronLeft className="size-4" />
                                <span>Previous</span>
                            </button>

                            <button
                                onClick={handleNext}
                                disabled={currentIdx === totalQuestions - 1}
                                className={`bg-primary-700 font-inter text-body-sm flex items-center justify-center rounded-xl px-5 py-2 font-semibold text-white transition-all duration-150 ${
                                    currentIdx === totalQuestions - 1
                                        ? 'cursor-not-allowed opacity-40'
                                        : 'hover:bg-primary-600 cursor-pointer active:scale-95'
                                }`}
                            >
                                <span>Next</span>
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>

                    {/* Navigator card */}
                    <div className="flex flex-col gap-6 rounded-3xl border border-neutral-950/5 bg-white p-6 shadow-sm sm:p-8 lg:col-span-4">
                        <h3 className="font-inter text-body-sm font-bold tracking-wider text-neutral-500 uppercase">
                            Questions
                        </h3>

                        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-4">
                            {mappedQuestions.map((_, idx) => {
                                const isCurrent = currentIdx === idx;
                                const isAnswered =
                                    userAnswers[idx] !== undefined &&
                                    userAnswers[idx] !== null;
                                const cellState = navigatorCellState({
                                    isCurrent,
                                    isAnswered,
                                });

                                let stateClass =
                                    'border-neutral-200 border bg-white text-neutral-600 hover:border-primary-700 hover:text-primary-700';
                                if (cellState === 'current') {
                                    stateClass =
                                        'border-primary-700 border bg-primary-700 shadow-primary-700/10 scale-105 font-bold text-white shadow-md';
                                } else if (cellState === 'answered') {
                                    stateClass =
                                        'border-primary-700/35 border bg-primary-700/5 text-primary-700 font-medium';
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIdx(idx)}
                                        className={`text-body-sm font-inter flex aspect-square cursor-pointer items-center justify-center rounded-xl transition-all duration-150 ${stateClass}`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="text-caption space-y-2.5 border-t border-neutral-950/5 pt-5 font-bold tracking-wide text-neutral-500 uppercase">
                            <div className="flex items-center gap-2">
                                <div className="bg-primary-700 size-2.5 shrink-0 rounded-xs" />
                                <span>Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="border-primary-700/35 bg-primary-700/5 size-2.5 shrink-0 rounded-xs border" />
                                <span>Answered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="size-2.5 shrink-0 rounded-xs border border-neutral-200 bg-white" />
                                <span>Not Answered</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmitChallenge}
                            className="bg-primary-700 shadow-primary-700/15 font-inter text-body-sm mt-2 w-full cursor-pointer rounded-2xl border-0 py-4 text-center font-bold tracking-wider text-white uppercase shadow-lg transition-all duration-150 hover:opacity-90 hover:shadow-xl active:scale-95"
                        >
                            Submit Challenge
                        </button>
                    </div>
                </div>
            </main>

            {/* Exit confirm — the app's destructive-confirm shape */}
            <AlertDialog.Root
                open={showExitModal}
                onOpenChange={setShowExitModal}
            >
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="animate-in fade-in fixed inset-0 z-50 bg-black/40 backdrop-blur-xs duration-150" />
                    <AlertDialog.Content className="animate-in fade-in zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-neutral-950/5 bg-white p-6 shadow-2xl duration-150 outline-none sm:p-8">
                        <div className="flex flex-col items-center gap-5 text-center">
                            <div className="bg-error-50 text-error-500 rounded-full p-4">
                                <AlertTriangle className="size-8 stroke-[2]" />
                            </div>
                            <div className="space-y-2">
                                <AlertDialog.Title className="font-poppins text-body-lg font-bold text-neutral-950">
                                    Exit Challenge?
                                </AlertDialog.Title>
                                <AlertDialog.Description className="font-inter text-body-sm leading-relaxed text-neutral-500">
                                    Are you sure you want to exit? Your answers
                                    will not be submitted and any current
                                    progress will be lost.
                                </AlertDialog.Description>
                            </div>
                            <div className="flex w-full items-center gap-3.5 pt-2">
                                <AlertDialog.Cancel asChild>
                                    <button className="font-inter text-body-sm flex-1 cursor-pointer rounded-xl border border-neutral-200 bg-transparent py-3 font-semibold tracking-wider text-neutral-700 uppercase transition duration-150 outline-none hover:bg-neutral-50">
                                        Cancel
                                    </button>
                                </AlertDialog.Cancel>
                                <AlertDialog.Action asChild>
                                    <button
                                        onClick={() =>
                                            router.visit(boardingUrl)
                                        }
                                        className="bg-error-500 hover:bg-error-600 font-inter text-body-sm flex-1 cursor-pointer rounded-xl border border-transparent py-3 font-bold tracking-wider text-white uppercase transition duration-150 outline-none"
                                    >
                                        Exit
                                    </button>
                                </AlertDialog.Action>
                            </div>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </div>
    );
}

Room.layout = (page) => <StudentLayout>{page}</StudentLayout>;
