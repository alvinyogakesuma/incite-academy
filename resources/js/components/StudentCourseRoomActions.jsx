import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    nextButtonLabel,
    reviewedLabel,
} from '@/Pages/Courses/Room/lessonRoom';

/**
 * The lesson room's bottom bar — Previous, Mark as Reviewed (or
 * its completed state), and Next / Finish Course. Ported from the
 * deprecated app's CourseRoomActions on the current design
 * tokens.
 */
export default function StudentCourseRoomActions({
    handlePrevious,
    handleNext,
    toggleMarkReviewed,
    hasPrevious,
    hasNext,
    isCurrentCompleted,
}) {
    return (
        <div className="font-inter mt-10 flex w-full flex-wrap items-center justify-between gap-4 border-t border-neutral-950/5 pt-6">
            {/* Previous button */}
            <button
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className={`text-body-sm flex items-center gap-1.5 rounded-xl border px-4.5 py-2.5 font-semibold transition-all duration-150 ${
                    hasPrevious
                        ? 'border-primary-700 text-primary-700 hover:bg-primary-700/5 cursor-pointer'
                        : 'cursor-not-allowed border-neutral-200 text-neutral-300'
                }`}
            >
                <ChevronLeft className="size-4" />
                <span>Previous</span>
            </button>

            {/* Mark as Reviewed button */}
            <button
                onClick={isCurrentCompleted ? undefined : toggleMarkReviewed}
                disabled={isCurrentCompleted}
                className={`text-body-sm flex items-center gap-2 rounded-xl border px-6 py-2.5 font-bold shadow-sm transition-all duration-200 ${
                    isCurrentCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-white opacity-85'
                        : 'border-primary-700 bg-primary-700 hover:bg-primary-600 cursor-pointer text-white'
                }`}
            >
                {isCurrentCompleted ? (
                    <>
                        <Check className="size-4 stroke-[3]" />
                        <span>{reviewedLabel(true)}</span>
                    </>
                ) : (
                    <span>{reviewedLabel(false)}</span>
                )}
            </button>

            {/* Next button */}
            <button
                onClick={handleNext}
                className="text-body-sm bg-primary-700 hover:bg-primary-600 flex cursor-pointer items-center gap-1.5 rounded-xl px-5 py-2.5 font-semibold text-white transition-all duration-150"
            >
                <span>{nextButtonLabel(hasNext)}</span>
                <ChevronRight className="size-4" />
            </button>
        </div>
    );
}
