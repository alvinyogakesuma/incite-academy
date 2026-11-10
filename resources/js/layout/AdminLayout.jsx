import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import AdminMobileHeader from '@/components/AdminMobileHeader';
import AdminContentArea from '@/components/AdminContentArea';

export default function AdminLayout({ children }) {
    // for toggling mobile sidebar
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="bg-primary-50 flex h-screen overflow-hidden">
            {/* Sidebar (handles desktop and mobile internally) */}
            <AdminSidebar
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            {/* Main Content Pane */}
            <div className="flex h-full flex-1 flex-col overflow-hidden">
                {/* Mobile Top Header */}
                <AdminMobileHeader onMenuClick={() => setIsMobileOpen(true)} />

                {/* Content Area */}
                <AdminContentArea>{children}</AdminContentArea>
            </div>
        </div>
    );
}
