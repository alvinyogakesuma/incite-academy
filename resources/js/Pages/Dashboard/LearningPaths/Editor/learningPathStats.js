/**
 * Learning path editor — the live sequence stats.
 *
 * The component keeps the react-hook-form wiring; this helper owns
 * the derivation so every outcome is unit testable:
 *
 *  - sequenceStatsFor  the selected courses' combined duration and
 *                      count, derived from the field array's slots
 *                      and the page's available courses: a null
 *                      slots array contributes nothing, bare slots
 *                      and null course ids drop out of the tally,
 *                      and a course carrying no duration sums as
 *                      zero.
 */

/**
 * The live sequence stats — the picked courses' combined duration
 * and count.
 */
export function sequenceStatsFor(selectedCourses, availableCourses) {
    const ids = (selectedCourses ?? [])
        .map((slot) => slot?.course_id)
        .filter((id) => id != null);

    const courses = availableCourses.filter((course) =>
        ids.includes(course.id),
    );

    return {
        totalDuration: courses.reduce(
            (acc, curr) => acc + (curr.duration || 0),
            0,
        ),
        coursesCount: courses.length,
    };
}
