/**
 * About This Course — the course's long description with its
 * paragraph formatting preserved. Ported from the deprecated
 * app's AboutCourse on the current design tokens.
 */
export default function StudentAboutCourse({ about }) {
    return (
        <div className="flex w-full flex-col gap-6 rounded-2xl border border-neutral-950/5 bg-white p-6 shadow-sm md:p-8">
            {/* Header */}
            <div>
                <h2 className="font-poppins text-body-lg font-bold text-neutral-950">
                    About This Course
                </h2>
            </div>

            {/* Description */}
            <div className="font-inter text-body-sm text-justify leading-relaxed whitespace-pre-line text-neutral-500">
                {about}
            </div>

            {/* Outcomes checklist — intentionally hidden: outcomes
                are currently part of long_description. Restore this
                block when outcomes are separated from description. */}
        </div>
    );
}
