/**
 * Users management table pipeline.
 *
 * The page keeps search, filtering, sorting, and pagination entirely
 * client-side; these helpers own that pipeline so every decision is
 * unit testable:
 *
 *  - filterUsers    matches search + role + department. Null-safe:
 *                   nim_nip and major_department are nullable columns,
 *                   so the search must not call toLowerCase() on null.
 *  - sortUsers      lodash orderBy with a case-insensitive iteratee
 *                   for string fields, numeric passthrough otherwise.
 *  - paginateUsers  slice window + totalPages floored at 1.
 *  - shouldShowReset 5-way "filters are dirty" check.
 *  - departmentOptions  distinct departments for the filter dropdown,
 *                   nulls filtered out.
 *  - nextSortState  sort header click: same field flips direction,
 *                   new field sorts ascending.
 *  - pageAfterDelete  clamps the current page when the last item on
 *                   it was removed. DD #4 (documented): assumes the
 *                   deleted user was in the filtered list; a stale
 *                   list (deleted elsewhere) clamps one item early.
 *  - formSuccessMessage  add-vs-edit toast copy.
 */
import orderBy from 'lodash/orderBy';

export const filterUsers = (users, { query, roleFilter, departmentFilter }) => {
    const search = query.toLowerCase();

    return users.filter((user) => {
        // Search match (null-safe: nim_nip/major_department are nullable)
        const matchesSearch =
            search === '' ||
            user.name.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            (user.nim_nip ?? '').toLowerCase().includes(search) ||
            (user.major_department ?? '').toLowerCase().includes(search);

        // Role match
        const matchesRole = roleFilter === 'All' || user.role === roleFilter;

        // Department match
        const matchesDepartment =
            departmentFilter === 'All' ||
            user.major_department === departmentFilter;

        return matchesSearch && matchesRole && matchesDepartment;
    });
};

export const sortUsers = (users, sortField, sortDirection) =>
    orderBy(
        users,
        [
            (user) =>
                typeof user[sortField] === 'string'
                    ? user[sortField].toLowerCase()
                    : user[sortField],
        ],
        [sortDirection],
    );

export const paginateUsers = (users, currentPage, pageSize) => {
    const start = (currentPage - 1) * pageSize;

    return {
        items: users.slice(start, start + pageSize),
        totalPages: Math.max(1, Math.ceil(users.length / pageSize)),
    };
};

export const shouldShowReset = ({
    searchQuery,
    roleFilter,
    departmentFilter,
    sortField,
    sortDirection,
}) =>
    Boolean(
        searchQuery ||
        roleFilter !== 'All' ||
        departmentFilter !== 'All' ||
        sortField !== 'name' ||
        sortDirection !== 'asc',
    );

export const departmentOptions = (users) => [
    ...new Set(
        users
            .map((user) => user.major_department)
            .filter((department) => Boolean(department)),
    ),
];

export const nextSortState = (field, currentField, currentDirection) => {
    if (field === currentField) {
        return {
            field,
            direction: currentDirection === 'asc' ? 'desc' : 'asc',
        };
    }

    return { field, direction: 'asc' };
};

export const pageAfterDelete = (currentPage, remainingCount, pageSize) => {
    const maxPage = Math.max(1, Math.ceil(remainingCount / pageSize));

    if (currentPage > maxPage) {
        return maxPage;
    }

    return currentPage;
};

export const formSuccessMessage = (isEdit) =>
    isEdit ? 'User successfully updated!' : 'User successfully added!';
