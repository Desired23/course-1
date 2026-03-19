# Phase A - Pagination & Filter Audit (System-wide)

Date: 2026-03-10  
Scope: `course_fe/src/pages/**`, `course_fe/src/services/**`

## 1) Goal

Establish current-state accuracy for list/filter/pagination across Public, User, Instructor, Admin pages before implementation phases.

## 2) Baseline Inventory

- Routes scanned:
1. Public: 39
2. User: 16
3. Instructor: 21
4. Admin: 25

- `getAll...` usage by page module (potential large-list risk):
1. Public: 7 pages
2. User: 2 pages
3. Instructor: 10 pages
4. Admin: 9 pages

## 3) Key Findings (Priority Order)

## P0 - Data correctness risk (truncated datasets)

Several `getAll...` helpers still fetch only `page=1&page_size=1000` and do not loop via `next`, so FE filtering can be incorrect when total rows exceed page size.

Evidence:
1. `getAllInstructorEarnings` only first page: `src/services/instructor-earnings.api.ts:99`
2. `getAllQnAs` and `getAllQnAAnswers` only first page: `src/services/qna.api.ts:81`, `src/services/qna.api.ts:120`
3. `getAllForums`, `getAllForumTopics`, `getAllForumComments` only first page: `src/services/forum.api.ts:99`, `src/services/forum.api.ts:143`, `src/services/forum.api.ts:188`
4. `getAllBlogComments` only first page: `src/services/blog-posts.api.ts:195`
5. Similar first-page-only pattern also exists in some helpers such as wishlist/cart/enrollments/lesson-comments.

Primary affected pages:
1. Instructor: `InstructorEarningsPage`, `InstructorSubscriptionRevenuePage`, `InstructorPayoutsPage`, `InstructorCommunicationPage`
2. Admin/Public: pages relying on forum or blog-comment `getAll...` helpers

## P1 - Mixed server-pagination + client-filter causing perceived mismatch

`CoursesPage` fetches one server page, then applies many filters client-side on that page only.

Evidence:
1. Server page query: `src/pages/public/CoursesPage.tsx:221`
2. Explicit client-side filter over `coursesPage.results`: `src/pages/public/CoursesPage.tsx:269`, `src/pages/public/CoursesPage.tsx:272`

Impact:
1. User can see fewer/missing matches compared to full dataset, depending on current server page.

## P1 - Large list pages still use load-all then local pagination/filter

Pattern appears in multiple Instructor/Admin pages: fetch all rows once, then FE filter + FE page.

Impact:
1. High memory/time for large datasets
2. Risk becomes correctness issue when helper itself is first-page-only (P0)

Typical examples:
1. `InstructorCoursesPage`, `InstructorResourcesPage`, `InstructorProfilePage`, `AdminCoursesPage`, `AdminUsersPage`, `AdminDashboard`

## P2 - API-shape mismatch resilience

`InstructorDiscountsPage` previously crashed at `promotions.map` when BE returned paginated object. Service normalization now protects this path.

Evidence:
1. Normalization in promotions service: `src/services/promotions.api.ts:78`
2. `getPromotions` now returns normalized array: `src/services/promotions.api.ts:87`

## 4) Direct Answer To Current Questions

1. "BE filter trả về dữ liệu giới hạn do paginate có làm sai dữ liệu thực tế không?"
Yes, in flows using first-page-only `getAll...` helpers. FE filters on partial dataset, so output can be wrong.

2. "Khi user xem hết trang hiện tại, qua trang sau FE có gọi query mới không?"
Yes for pages wired with server pagination state in effect deps. Examples:
- `WishlistPage`: `src/pages/user/WishlistPage.tsx:43`, deps include `currentPage`: `src/pages/user/WishlistPage.tsx:69`
- `MyLearningPage`: `src/pages/user/MyLearningPage.tsx:45`, deps include `currentPage`: `src/pages/user/MyLearningPage.tsx:87`
- `NotificationsPage`: `src/pages/user/NotificationsPage.tsx:82`, deps include `currentPage`: `src/pages/user/NotificationsPage.tsx:105`
- `TransactionHistoryPage`: payments/refunds each query by page: `src/pages/user/TransactionHistoryPage.tsx:123`, `src/pages/user/TransactionHistoryPage.tsx:155`

3. Exception:
Pages using load-all + local pagination do not call BE for page 2, page 3 in UI paging. They slice existing local array only.

## 5) What Is Already Correct

These helpers already auto-paginate correctly via `next` loop:
1. `getAllCourses`: `src/services/course.api.ts:213`
2. `getAllNotificationsByUser`: `src/services/notification.api.ts:60`
3. `getAllReviews*`: `src/services/review.api.ts:63`
4. `getAllPublishedBlogPosts`: `src/services/blog-posts.api.ts:93`
5. `getAllInstructors`, `getAllCourseModules`, `getAllLessons`

## 6) Implementation Plan For Next Phases

## Phase B (Correctness First)
1. Standardize all `getAll...` helpers to true auto-pagination loop.
2. Replace first-page-only helpers in high-traffic Instructor/Admin/Public flows.
3. Add one shared utility (`fetchAllPages`) with guards for max pages and cancellation.

Done criteria:
1. No helper named `getAll...` returns only first page.
2. QA dataset > 1,000 rows still returns correct filtered totals.

## Phase C (Move Filters To BE Where Needed)
1. Convert large-list pages from load-all/local-filter to server filter + server pagination.
2. Keep FE filter only for purely presentational controls.

Done criteria:
1. Page change always triggers BE query for list views with large datasets.
2. Filter totals match BE count.

## Phase D (Performance + Consistency)
1. Add request cancellation/debounce for search.
2. Cache strategy by query key for repeated list navigation.
3. Add telemetry on response size and query latency.

Done criteria:
1. No duplicate refetch spikes during rapid filter/page interaction.
2. Consistent UX and accurate totals across all dashboards.

