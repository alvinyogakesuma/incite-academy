/**
 * Map a failed Zod validation to an error-bag object keyed by field
 * name, keeping only the first issue per field.
 */
export default function zodFieldErrors(error) {
    const fieldErrors = {};

    for (const issue of error.issues) {
        if (!fieldErrors[issue.path[0]]) {
            fieldErrors[issue.path[0]] = issue.message;
        }
    }

    return fieldErrors;
}
