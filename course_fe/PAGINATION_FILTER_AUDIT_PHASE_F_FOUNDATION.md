# Phase F - Platform Standardization (Foundation)

Date: 2026-03-11
Scope: Shared FE list contract + shared BE list-param parsing, applied to Instructor Subscription Revenue flow

## 1) Unified Standards

## FE standard

1. Shared typed pagination response:
- `PaginatedResponse<T>` in `src/services/common/pagination.ts`

2. Shared list query builder:
- `buildListQuery(...)` in `src/services/common/pagination.ts`
- Normalizes and removes empty params consistently (`page`, `page_size`, `search`, `sort_by`, etc.)

3. Service contract naming:
- List endpoints use `page`, `page_size`, `search`, `sort_by`

## BE standard

1. Shared list param helpers:
- `get_search_param`
- `get_sort_param`
- `get_int_param`
- File: `course/utils/list_params.py`

2. View-level parsing convention:
- Parse and validate `search/sort_by/instructor_id` via helper instead of per-view ad-hoc parsing.

3. Pagination envelope:
- Continue using shared `paginate_queryset(...)` / `StandardPagination` (`count/next/previous/page/total_pages/page_size/results`).

## 2) Applied Refactors

## FE

1. `src/services/instructor-earnings.api.ts`
- Migrated to shared `PaginatedResponse` + `buildListQuery`.

2. `src/services/instructor.api.ts`
- Migrated paginated instructor list call to shared query builder.

## BE

1. `course/instructor_earnings/views.py`
- Refactored list/summary/subscription-breakdown endpoints to use shared list-param helpers.
- Standardized `sort_by` whitelist handling.

## 3) Validation

1. FE build: pass (`npm run build`)
2. BE checks: pass (`python manage.py check`)

## 4) Why This Meets Phase F

1. FE now has a reusable list foundation (typed pagination + query param normalization).
2. BE now has reusable, centralized list param parsing helpers.
3. Naming/query conventions are explicit and reusable for next domains.

## 5) Rollout Plan For Remaining Domains

1. Public batch: migrate `course.api`, `review.api`, `blog-posts.api` list services to shared FE pagination module.
2. User batch: migrate `wishlist.api`, `notification.api`, `support.api`, `payment.api`.
3. Instructor batch: migrate `instructor-payouts.api`, `lessons/attachments` list services.
4. Admin batch: migrate `admin.api` list handlers and align BE views to `utils/list_params.py`.
