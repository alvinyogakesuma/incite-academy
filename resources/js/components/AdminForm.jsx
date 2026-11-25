import AdminFormHeader from '@/components/AdminFormHeader';

/**
 * Shared admin form template — header bar plus an empty two-column
 * (1/3 + 2/3) panel grid. All labels derive from `title`: page title
 * "Create New {title}", save button "Save {title}". `backText` is
 * required and renders as "Back to {backText}". Consumers place the
 * panel containers (AdminLeftPanelContainer / AdminRightPanelContainer)
 * themselves as children.
 * UI-only import: no submit logic, onSave is presentation-only.
 */
export default function AdminForm({
    title,
    backTarget,
    backUrl,
    onBack,
    onSave,
    isSaving = false,
    children,
}) {
    return (
        <>
            <AdminFormHeader
                backTarget={backTarget}
                backUrl={backUrl}
                onBack={onBack}
                onSave={onSave}
                isSaving={isSaving}
                title={title}
            />

            <div className="grid grid-cols-1 items-start gap-6 md:gap-8 lg:grid-cols-3">
                {children}
            </div>
        </>
    );
}
