// import { useState, useMemo } from 'react';
// import { Head, router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminHeader from '@/components/AdminHeader';
// import Toast from '@/components/Toast';
// import SearchBar from '../../../components/Admin/SearchBar';
// import Pagination from '../../../components/Admin/Pagination';
// import DeleteConfirmationDialog from '../../../components/Admin/DeleteConfirmationDialog';
// import UserList from '../../../components/Admin/User/UserList';
// import UserFormDialog from '../../../components/Admin/User/UserFormDialog';

export default function Users() {
    return (
        <>
            <div className="space-y-8">
                {/* Header Section */}
                <AdminHeader
                    title="Users Management"
                    subtitle="Manage platform users, roles, point achievements and departments."
                    label="Add User"
                    icon={Plus}
                    onClick={() => {}}
                />
            </div>
        </>
    );
}

// Wrap inside persistent AdminLayout dashboard wrapper
Users.layout = (page) => <AdminLayout>{page}</AdminLayout>;
