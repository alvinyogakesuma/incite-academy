import { useState, useMemo } from 'react';
import orderBy from 'lodash/orderBy';
import { Plus } from 'lucide-react';
import AdminLayout from '@/layout/AdminLayout';
import AdminHeader from '@/components/AdminHeader';
import SearchBar from '@/components/SearchBar';
import UserList from '@/components/UserList';
import Pagination from '@/components/Pagination';
import { DUMMY_USERS } from '@/data/dummyUsers';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export default function Users() {
    const users = DUMMY_USERS;

    // Search, Filtering, and Sorting State (all client-side)
    const [searchQuery, setSearchQuery] = useState(''); // search bar state
    const [roleFilter, setRoleFilter] = useState('All'); // role selection state
    const [departmentFilter, setDepartmentFilter] = useState('All'); //departement selection state
    const [sortField, setSortField] = useState('name'); //field sorting state
    const [sortDirection, setSortDirection] = useState('asc'); //sorting direction state

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
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
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    // Stage 1 = filter the users
    const filteredUsers = useMemo(() => {
        const query = searchQuery.toLowerCase();

        return users.filter((user) => {
            // Search match
            const matchesSearch =
                query === '' ||
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.nim_nip.toLowerCase().includes(query) ||
                user.major_department.toLowerCase().includes(query);

            // Role match
            const matchesRole =
                roleFilter === 'All' || user.role === roleFilter;

            // Department match
            const matchesDepartment =
                departmentFilter === 'All' ||
                user.major_department === departmentFilter;

            return matchesSearch && matchesRole && matchesDepartment;
        });
    }, [users, searchQuery, roleFilter, departmentFilter]);

    // Stage 2 = Sort the Users
    const sortedUsers = useMemo(
        () =>
            orderBy(
                filteredUsers,
                [
                    (user) =>
                        typeof user[sortField] === 'string'
                            ? user[sortField].toLowerCase()
                            : user[sortField],
                ],
                [sortDirection],
            ),
        [filteredUsers, sortField, sortDirection],
    );

    // Stage 3 = Paginate the Users
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedUsers.slice(start, start + pageSize);
    }, [sortedUsers, currentPage, pageSize]);

    const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));

    const showReset =
        searchQuery ||
        roleFilter !== 'All' ||
        departmentFilter !== 'All' ||
        sortField !== 'name' ||
        sortDirection !== 'asc';

    const departments = [
        ...new Set(users.map((user) => user.major_department)),
    ];

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
                    onClick={() => {}}
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
                    onEdit={() => {}}
                    onDelete={() => {}}
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
            </div>
        </>
    );
}

Users.layout = (page) => <AdminLayout>{page}</AdminLayout>;
