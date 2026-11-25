import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminHeader from '@/components/AdminHeader';
import SearchBar from '@/components/SearchBar';
import UserList from '@/components/UserList';
import Pagination from '@/components/Pagination';
import UserFormDialog from './UserFormDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import Toast from '@/components/Toast';
import {
    filterUsers,
    sortUsers,
    paginateUsers,
    shouldShowReset,
    departmentOptions,
    nextSortState,
    pageAfterDelete,
    formSuccessMessage,
} from './userTable';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export default function Users({ users = [], majorDepartements = [] }) {
    // Search, Filtering, and Sorting State (all client-side)
    const [searchQuery, setSearchQuery] = useState(''); // search bar state
    const [roleFilter, setRoleFilter] = useState('All'); // role selection state
    const [departmentFilter, setDepartmentFilter] = useState('All'); //departement selection state
    const [sortField, setSortField] = useState('name'); //field sorting state
    const [sortDirection, setSortDirection] = useState('asc'); //sorting direction state

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal Control States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Toast State
    const [toast, setToast] = useState(null);

    // Editing/Deleting Data States
    const [userToEdit, setUserToEdit] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);

    const showToast = (type, title, description) => {
        setToast({ type, title, description });
        setTimeout(() => setToast(null), 5000);
    };

    const startAdd = () => {
        setUserToEdit(null);
        setIsFormOpen(true);
    };

    const startEdit = (user) => {
        setUserToEdit(user);
        setIsFormOpen(true);
    };

    const startDelete = (user) => {
        setUserToDelete(user);
        setIsDeleteOpen(true);
    };

    // Reset Filters to defaults
    const handleResetFilters = () => {
        setSearchQuery('');
        setRoleFilter('All');
        setDepartmentFilter('All');
        setSortField('name');
        setSortDirection('asc');
        setCurrentPage(1);
    };

    // it sets the value and setthe page to page 1
    const handleFilterChange = (setter, val) => {
        setter(val);
        setCurrentPage(1);
    };

    // Handle sort click toggle
    const handleSort = (field) => {
        const next = nextSortState(field, sortField, sortDirection);

        setSortField(next.field);
        setSortDirection(next.direction);
        setCurrentPage(1);
    };

    // Handle form save/update — the dialog performs the request itself
    // (via Inertia router on react-hook-form submit) and calls onSuccess/onError here.
    const handleFormSuccess = (isEdit) => {
        setIsFormOpen(false);
        showToast('success', formSuccessMessage(isEdit));
    };

    const handleFormError = () => {
        showToast('error', 'Validation Error', 'Please check the form fields.');
    };

    // Confirm and execute delete.
    const confirmDelete = () => {
        if (!userToDelete) return;

        router.delete(`/dashboard/users/${userToDelete.id}`, {
            onSuccess: () => {
                setIsDeleteOpen(false);
                setUserToDelete(null);
                showToast('success', 'User successfully deleted!');

                // Clamp the current page if the last item on it was removed
                const next = pageAfterDelete(
                    currentPage,
                    sortedUsers.length - 1,
                    pageSize,
                );
                setCurrentPage(next);
            },
            onError: () => {
                showToast('error', 'Failed to delete user.');
            },
        });
    };

    // Stage 1 = filter the users
    const filteredUsers = useMemo(
        () =>
            filterUsers(users, {
                query: searchQuery,
                roleFilter,
                departmentFilter,
            }),
        [users, searchQuery, roleFilter, departmentFilter],
    );

    // Stage 2 = Sort the Users
    const sortedUsers = useMemo(
        () => sortUsers(filteredUsers, sortField, sortDirection),
        [filteredUsers, sortField, sortDirection],
    );

    // Stage 3 = Paginate the Users
    const { items: paginatedUsers, totalPages } = useMemo(
        () => paginateUsers(sortedUsers, currentPage, pageSize),
        [sortedUsers, currentPage, pageSize],
    );

    const showReset = shouldShowReset({
        searchQuery,
        roleFilter,
        departmentFilter,
        sortField,
        sortDirection,
    });

    const departments = departmentOptions(users);

    const userFilters = [
        {
            name: 'role',
            label: 'Role:',
            value: roleFilter,
            onChange: (val) => handleFilterChange(setRoleFilter, val),
            options: ['All', 'student', 'admin'],
        },
        {
            name: 'department',
            label: 'Dept:',
            value: departmentFilter,
            onChange: (val) => handleFilterChange(setDepartmentFilter, val),
            options: ['All', ...departments],
        },
    ];

    return (
        <>
            <div className="space-y-8">
                {/* ========== HEADER SECTION ========== */}
                <AdminHeader
                    title="Users Management"
                    subtitle="Manage platform users, roles, point achievements and departments."
                    label="Add User"
                    icon={Plus}
                    onClick={startAdd}
                />

                {/* ========== FILTERS & CONTROLS ========== */}
                <SearchBar
                    value={searchQuery}
                    onChange={(val) => handleFilterChange(setSearchQuery, val)}
                    placeholder="Search users by name, email, NIM/NIP..."
                    filters={userFilters}
                    showReset={Boolean(showReset)}
                    onReset={handleResetFilters}
                />

                {/* ========== TABLE CARD LAYOUT ========== */}
                <UserList
                    users={paginatedUsers}
                    onEdit={startEdit}
                    onDelete={startDelete}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    onResetFilters={handleResetFilters}
                />

                {/* ========== PAGINATION CONTROLS ========== */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalRecords={sortedUsers.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) =>
                        handleFilterChange(setPageSize, size)
                    }
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                />

                {/* ========== ADD/EDIT DIALOG (MODAL) ========== */}
                <UserFormDialog
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    user={userToEdit}
                    onSuccess={handleFormSuccess}
                    onError={handleFormError}
                    majorDepartements={majorDepartements}
                />

                {/* ========== DELETE CONFIRMATION ALERT DIALOG (MODAL) ========== */}
                <DeleteConfirmationDialog
                    open={isDeleteOpen}
                    onOpenChange={setIsDeleteOpen}
                    title="Delete User Account"
                    description={`Are you sure you want to delete ${userToDelete?.name}? This action will permanently remove this user profile from the platform directory.`}
                    confirmLabel="Delete User"
                    onConfirm={confirmDelete}
                    isSubmitting={false}
                />
            </div>

            {/* ========== TOAST NOTIFICATION ========== */}
            <Toast
                open={Boolean(toast)}
                onOpenChange={(open) => !open && setToast(null)}
                title={toast?.title}
                description={toast?.description}
                type={toast?.type}
            />
        </>
    );
}

Users.layout = (page) => <AdminLayout>{page}</AdminLayout>;
