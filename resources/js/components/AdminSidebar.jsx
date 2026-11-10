import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Dialog } from 'radix-ui';
import { LayoutDashboard, Users } from 'lucide-react';
import AdminSidebarHeader from './AdminSidebarHeader';
import AdminSidebarMenu from './AdminSidebarMenu';
import AdminSidebarProfile from './AdminSidebarProfile';

const getInitials = (name) =>
    name
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

export default function AdminSidebar({ isMobileOpen, setIsMobileOpen }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const { url, props } = usePage();
    const user = props.auth?.user ?? {
        name: 'Admin',
        email: 'admin@itera.ac.id',
    };

    const cleanUrl = url.split('?')[0];
    const menuItems = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            href: '/dashboard',
            active: cleanUrl === '/dashboard',
        },
        {
            name: 'Users',
            icon: Users,
            href: '/dashboard/users',
            active: cleanUrl.startsWith('/dashboard/users'),
        },
    ];

    return (
        <>
            {/* Desktop */}
            <BaseSidebar
                className={`hidden h-full shrink-0 flex-col transition-all duration-300 ease-in-out lg:flex ${
                    isCollapsed ? 'w-[78px]' : 'w-[268px]'
                }`}
                isCollapsed={isCollapsed}
                onExpand={() => setIsCollapsed(false)}
                onCollapse={() => setIsCollapsed(true)}
                menuItems={menuItems}
                user={user}
                setIsMobileOpen={setIsMobileOpen}
            />

            {/* Mobile drawer */}
            <Dialog.Root open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden" />
                    <Dialog.Content className="outline-none">
                        <Dialog.Title className="sr-only">
                            Navigation Menu
                        </Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Main navigation for the admin dashboard
                        </Dialog.Description>
                        <BaseSidebar
                            isMobile
                            menuItems={menuItems}
                            user={user}
                            setIsMobileOpen={setIsMobileOpen}
                            className="fixed inset-y-0 left-0 z-50 flex h-full w-[268px] flex-col lg:hidden"
                        />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
}

function BaseSidebar({
    className = '',
    isMobile = false,
    isCollapsed = false,
    menuItems = [],
    user,
    setIsMobileOpen,
    onExpand,
    onCollapse,
}) {
    // the mobile drawer is never collapsed — only desktop can be
    const collapsed = isMobile ? false : isCollapsed;

    return (
        <aside
            className={`border-r border-neutral-950/5 bg-neutral-50 ${className}`}
        >
            <AdminSidebarHeader
                collapsed={collapsed}
                isMobile={isMobile}
                onExpand={onExpand}
                onCollapse={onCollapse}
                onCloseMobile={() => setIsMobileOpen(false)}
            />
            <AdminSidebarMenu
                menuItems={menuItems}
                collapsed={collapsed}
                onLinkClick={() => setIsMobileOpen(false)}
            />
            <AdminSidebarProfile
                user={user}
                initials={getInitials(user.name)}
                collapsed={collapsed}
            />
        </aside>
    );
}
