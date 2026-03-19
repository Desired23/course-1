# Phase G - Batch User / Instructor / Admin (Implemented)

Date: 2026-03-11

## 1) Batch User

Result: No critical list-page regression requiring refactor in this pass.

Notes:
1. Core user list pages (`Wishlist`, `MyLearning`, `Notifications`, `UserSubscriptions`, `UserPaymentMethods`, `TransactionHistory`, `MyReviews`) are already server-driven with `page/page_size/search/sort_by`.
2. Remaining local filtering in user area is mainly non-list content (e.g., FAQ search in Support) or non-paginated dashboard snippets.

## 2) Batch Instructor

Target fixed: `InstructorDashboard` course table.

Changes:
1. Replaced local `course_stats` filter/slice pagination with server-side list query via `getCourses(...)`.
2. Query now re-fetches on page/filter/search/sort changes (`page`, `page_size`, `status`, `search`, `ordering`, `instructor_id`).
3. Kept dashboard summary cards from `getInstructorDashboardStats()`, while table list is backend-authoritative.

File:
1. `src/pages/instructor/InstructorDashboard.tsx`

## 3) Batch Admin

Target fixed: `AdminDashboard` lists.

Changes:
1. Removed load-all pattern (`getAllUsers`, `getAllCourses`) from dashboard tables.
2. Users table now fetches first paginated page with server-side search (`getUsers({ page: 1, page_size: 10, search })`).
3. Courses table now fetches first paginated page with server-side search (`getCourses({ page: 1, page_size: 10, search })`).
4. Dashboard stats call remains separate and lightweight (`getAdminDashboardStats()`).

File:
1. `src/pages/admin/AdminDashboard.tsx`

## 4) Validation

1. FE build: pass (`npm run build`)
2. BE check: pass (`python manage.py check`)

## 5) Outcome

Phase G rollout is completed across domains with focus on high-risk list flows:
1. Public: `CoursesPage` moved to server-side filters/pagination.
2. User: verified major list pages already server-side.
3. Instructor: `InstructorDashboard` course list now server-driven.
4. Admin: `AdminDashboard` user/course tables now server-driven (no load-all).
