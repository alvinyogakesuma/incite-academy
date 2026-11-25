import StudentNavbar from '@/components/StudentNavbar';
import StudentFooter from '@/components/StudentFooter';

/**
 * Student-facing layout — the navbar over a tinted page
 * background, with the brand footer band below. Wraps the student
 * pages the way AdminLayout wraps the dashboard.
 */
export default function StudentLayout({ children }) {
    return (
        <div className="bg-primary-50/40 flex min-h-screen flex-col">
            <StudentNavbar />
            <main className="flex-1">{children}</main>
            <StudentFooter />
        </div>
    );
}
