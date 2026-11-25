/**
 * Users table pipeline tests.
 *
 * Covers every decision in userTable.js:
 *
 *  filterUsers
 *   D1  empty-query short-circuit            (empty → all / non-empty)
 *   D2  searchable fields                    (name / email / nim_nip /
 *       major_department match → kept, none match → dropped)
 *   D3  case-insensitive search
 *   D4  null nim_nip is safe                  (DD #1 — used to crash)
 *   D5  null major_department is safe         (DD #2 — used to crash)
 *   D6  role filter                          (All / match / mismatch)
 *   D7  department filter                    (All / match / mismatch)
 *   D8  AND composition                     (search + role + dept)
 *
 *  sortUsers
 *   D9  string fields sort case-insensitively
 *   D10 numeric fields pass through
 *   D11 asc / desc direction
 *
 *  paginateUsers
 *   D12 slice windows                       (first / middle / last)
 *   D13 page beyond range → empty items
 *   D14 totalPages floors at 1              (empty list)
 *
 *  shouldShowReset
 *   D15 each of the five conditions triggers (5 cases)
 *   D16 all defaults → false
 *
 *  departmentOptions
 *   D17 dedupes repeated departments
 *   D18 nulls are filtered out              (DD #3)
 *
 *  nextSortState
 *   D19 same field flips asc → desc
 *   D20 same field flips desc → asc
 *   D21 different field → new field + asc
 *
 *  pageAfterDelete
 *   D22 clamps when the last item on the page was removed
 *   D23 keeps the page when it is still valid
 *   D24 floors at 1                         (list becomes empty)
 *   DD #4 documented: assumes the deleted user was in the filtered
 *   list; a stale list clamps one item early.
 *
 *  formSuccessMessage
 *   D25 edit → updated / D26 add → added
 */
import { describe, it, expect } from 'vitest';
import {
    filterUsers,
    sortUsers,
    paginateUsers,
    shouldShowReset,
    departmentOptions,
    nextSortState,
    pageAfterDelete,
    formSuccessMessage,
} from '../userTable';

/** Mirrors the UserController::mapUser shape (nim_nip/major_department nullable). */
const USERS = [
    {
        id: 1,
        name: 'Alvin Yoga',
        email: 'alvin.121140154@student.itera.ac.id',
        role: 'student',
        nim_nip: '121140154',
        major_department: 'Teknik Informatika',
        total_points: 120,
    },
    {
        id: 2,
        name: 'Budi Santoso',
        email: 'budi@if.itera.ac.id',
        role: 'admin',
        nim_nip: '198504122010011001',
        major_department: 'Teknik Informatika',
        total_points: 500,
    },
    {
        id: 3,
        name: 'Citra Dewi',
        email: 'citra.121170001@student.itera.ac.id',
        role: 'student',
        nim_nip: '121170001',
        major_department: 'Fisika',
        total_points: 30,
    },
];

const NO_FILTERS = {
    query: '',
    roleFilter: 'All',
    departmentFilter: 'All',
};

describe('filterUsers', () => {
    it('D1 — an empty query returns every user', () => {
        expect(filterUsers(USERS, NO_FILTERS)).toHaveLength(3);
    });

    it('D2 — matches on name', () => {
        const result = filterUsers(USERS, { ...NO_FILTERS, query: 'budi' });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D2 — matches on email', () => {
        const result = filterUsers(USERS, {
            ...NO_FILTERS,
            query: '121170001',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('D2 — matches on nim_nip', () => {
        const result = filterUsers(USERS, {
            ...NO_FILTERS,
            query: '19850412',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D2 — matches on major_department', () => {
        const result = filterUsers(USERS, { ...NO_FILTERS, query: 'fisika' });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('D2 — drops users that match no field', () => {
        expect(
            filterUsers(USERS, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
    });

    it('D3 — the search is case-insensitive both ways', () => {
        expect(
            filterUsers(USERS, { ...NO_FILTERS, query: 'BUDI' }),
        ).toHaveLength(1);

        expect(
            filterUsers(USERS, { ...NO_FILTERS, query: 'ALVIN' }),
        ).toHaveLength(1);
    });

    it('D4 — a null nim_nip does not crash the search (DD #1)', () => {
        const withNullNim = [
            ...USERS,
            {
                id: 4,
                name: 'Farhan Akbar',
                email: 'farhan@itera.ac.id',
                role: 'student',
                nim_nip: null,
                major_department: 'UPA TIK',
            },
        ];

        const result = filterUsers(withNullNim, {
            ...NO_FILTERS,
            query: 'farhan',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(4);
    });

    it('D5 — a null major_department does not crash the search (DD #2)', () => {
        const withNullDept = [
            ...USERS,
            {
                id: 5,
                name: 'Eka Putri',
                email: 'eka@itera.ac.id',
                role: 'student',
                nim_nip: '121180002',
                major_department: null,
            },
        ];

        const result = filterUsers(withNullDept, {
            ...NO_FILTERS,
            query: 'eka',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(5);
    });

    it('D5 — the search falls through every branch with null fields without crashing', () => {
        // The query misses name, email, nim, and department so the ||
        // chain evaluates both ?? fallbacks (null nim → '', null dept
        // → '') — the exact path that crashed before the null-safety
        // fix, where user.nim_nip.toLowerCase() threw on null.
        const withNulls = [
            {
                id: 6,
                name: 'Zaki Rahman',
                email: 'zaki@itera.ac.id',
                role: 'student',
                nim_nip: null,
                major_department: null,
            },
        ];

        expect(
            filterUsers(withNulls, { ...NO_FILTERS, query: 'zzz' }),
        ).toHaveLength(0);
    });

    it('D6 — the role filter matches the exact role', () => {
        const result = filterUsers(USERS, {
            ...NO_FILTERS,
            roleFilter: 'admin',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('D6 — the role filter drops non-matching roles', () => {
        expect(
            filterUsers(USERS, { ...NO_FILTERS, roleFilter: 'teacher' }),
        ).toHaveLength(0);
    });

    it('D7 — the department filter matches the exact department', () => {
        const result = filterUsers(USERS, {
            ...NO_FILTERS,
            departmentFilter: 'Fisika',
        });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('D7 — the department filter drops non-matching departments', () => {
        expect(
            filterUsers(USERS, {
                ...NO_FILTERS,
                departmentFilter: 'Teknik Geologi',
            }),
        ).toHaveLength(0);
    });

    it('D8 — search, role, and department compose with AND', () => {
        // 'student' AND 'Teknik Informatika' AND search 'alvin' → user 1
        expect(
            filterUsers(USERS, {
                query: 'alvin',
                roleFilter: 'student',
                departmentFilter: 'Teknik Informatika',
            }),
        ).toHaveLength(1);

        // same search but admin role → nothing
        expect(
            filterUsers(USERS, {
                query: 'alvin',
                roleFilter: 'admin',
                departmentFilter: 'Teknik Informatika',
            }),
        ).toHaveLength(0);
    });
});

describe('sortUsers', () => {
    it('D9 — string fields sort case-insensitively', () => {
        const mixed = [
            { name: 'budi', total_points: 0 },
            { name: 'Alvin', total_points: 0 },
        ];

        expect(sortUsers(mixed, 'name', 'asc').map((u) => u.name)).toEqual([
            'Alvin',
            'budi',
        ]);
    });

    it('D10 — numeric fields sort numerically', () => {
        const sorted = sortUsers(USERS, 'total_points', 'asc');

        expect(sorted.map((u) => u.total_points)).toEqual([30, 120, 500]);
    });

    it('D11 — desc reverses the order', () => {
        expect(
            sortUsers(USERS, 'total_points', 'desc').map((u) => u.id),
        ).toEqual([2, 1, 3]);

        expect(sortUsers(USERS, 'name', 'desc').map((u) => u.name)).toEqual([
            'Citra Dewi',
            'Budi Santoso',
            'Alvin Yoga',
        ]);
    });
});

describe('paginateUsers', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ id: i + 1 }));

    it('D12 — slices the first page', () => {
        const { items } = paginateUsers(many, 1, 3);

        expect(items.map((u) => u.id)).toEqual([1, 2, 3]);
    });

    it('D12 — slices a middle page', () => {
        const { items } = paginateUsers(many, 2, 3);

        expect(items.map((u) => u.id)).toEqual([4, 5, 6]);
    });

    it('D12 — slices the partial last page', () => {
        const { items, totalPages } = paginateUsers(many, 3, 3);

        expect(items.map((u) => u.id)).toEqual([7]);
        expect(totalPages).toBe(3);
    });

    it('D13 — a page beyond the range yields empty items', () => {
        const { items, totalPages } = paginateUsers(many, 9, 3);

        expect(items).toEqual([]);
        expect(totalPages).toBe(3);
    });

    it('D14 — totalPages floors at 1 for an empty list', () => {
        const { items, totalPages } = paginateUsers([], 1, 10);

        expect(items).toEqual([]);
        expect(totalPages).toBe(1);
    });
});

describe('shouldShowReset', () => {
    const defaults = {
        searchQuery: '',
        roleFilter: 'All',
        departmentFilter: 'All',
        sortField: 'name',
        sortDirection: 'asc',
    };

    it('D15 — a dirty search query shows the reset button', () => {
        expect(shouldShowReset({ ...defaults, searchQuery: 'a' })).toBe(true);
    });

    it('D15 — a role filter shows the reset button', () => {
        expect(shouldShowReset({ ...defaults, roleFilter: 'admin' })).toBe(
            true,
        );
    });

    it('D15 — a department filter shows the reset button', () => {
        expect(
            shouldShowReset({ ...defaults, departmentFilter: 'Fisika' }),
        ).toBe(true);
    });

    it('D15 — a non-default sort field shows the reset button', () => {
        expect(shouldShowReset({ ...defaults, sortField: 'role' })).toBe(true);
    });

    it('D15 — a desc sort direction shows the reset button', () => {
        expect(shouldShowReset({ ...defaults, sortDirection: 'desc' })).toBe(
            true,
        );
    });

    it('D16 — all defaults hide the reset button', () => {
        expect(shouldShowReset(defaults)).toBe(false);
    });
});

describe('departmentOptions', () => {
    it('D17 — dedupes repeated departments', () => {
        const options = departmentOptions(USERS);

        expect(options).toEqual(['Teknik Informatika', 'Fisika']);
    });

    it('D18 — filters null departments out (DD #3)', () => {
        const withNull = [
            ...USERS,
            { id: 9, name: 'X', major_department: null },
        ];

        const options = departmentOptions(withNull);

        expect(options).toEqual(['Teknik Informatika', 'Fisika']);
    });
});

describe('nextSortState', () => {
    it('D19 — clicking the active asc header flips to desc', () => {
        expect(nextSortState('name', 'name', 'asc')).toEqual({
            field: 'name',
            direction: 'desc',
        });
    });

    it('D20 — clicking the active desc header flips back to asc', () => {
        expect(nextSortState('name', 'name', 'desc')).toEqual({
            field: 'name',
            direction: 'asc',
        });
    });

    it('D21 — clicking a new header sorts that field ascending', () => {
        expect(nextSortState('role', 'name', 'desc')).toEqual({
            field: 'role',
            direction: 'asc',
        });
    });
});

describe('pageAfterDelete', () => {
    it('D22 — clamps when the last item on the page was removed', () => {
        // 6 items on page 3 of pageSize 3 → after delete, max page is 2
        expect(pageAfterDelete(3, 5, 3)).toBe(2);
    });

    it('D23 — keeps the page when it is still valid', () => {
        expect(pageAfterDelete(1, 5, 3)).toBe(1);
        expect(pageAfterDelete(2, 5, 3)).toBe(2);
    });

    it('D24 — floors at 1 when the list becomes empty', () => {
        expect(pageAfterDelete(2, 0, 3)).toBe(1);
    });
});

describe('formSuccessMessage', () => {
    it('D25 — edit yields the updated message', () => {
        expect(formSuccessMessage(true)).toBe('User successfully updated!');
    });

    it('D26 — add yields the added message', () => {
        expect(formSuccessMessage(false)).toBe('User successfully added!');
    });
});
