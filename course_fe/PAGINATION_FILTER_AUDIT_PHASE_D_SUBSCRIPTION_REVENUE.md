# Phase D - BE Implementation Audit (Subscription Revenue)

Date: 2026-03-11
Scope: `GET /api/instructor-earnings/` and `GET /api/instructor-earnings/summary/` for `InstructorSubscriptionRevenuePage`

## 1) Findings Before Fix

## Critical

1. Instructor scope leak risk on list endpoint:
- Behavior: non-admin request without `instructor_id` could fall back to global earnings queryset.
- Root cause: view branch selected `get_instructor_earnings(...)` when `instructor_id` missing.
- Risk: wrong dataset between FE/BE and potential data exposure across instructors.

## High

1. Summary endpoint contract mismatch:
- Behavior: FE page called summary without `instructor_id`, while BE required it.
- Risk: page load could fail in `Promise.all`, breaking data rendering.

## Medium

1. List endpoint lacked standard query params for this page use-case:
- Missing/implicit in endpoint behavior: `search`, `sort_by`.
- Impact: FE had to rely on load-all + local filter/sort.

2. Query performance weaknesses:
- No explicit `is_deleted=False` in list base queryset.
- No `select_related` for serializer-related fields (`course`, `payment`, `plan`, `instructor.user`) -> N+1 risk.
- Index coverage not aligned with common list path (`instructor + is_deleted + earning_date/status`).

## 2) Changes Implemented (Phase D)

1. Standardized list query handling in view:
- Added `search` and `sort_by` parsing:
  - `search` on `course__title`, `instructor__user__full_name`, `user_subscription__plan__name`
  - `sort_by` supports: `newest`, `oldest`, `earnings_desc`, `earnings_asc`, `course_asc`, `course_desc`
- File: `course/instructor_earnings/views.py`

2. Enforced role-safe scope:
- For non-admin, endpoint auto-scopes to authenticated instructor if `instructor_id` not passed.
- Rejects cross-instructor access attempts from non-admin.
- File: `course/instructor_earnings/views.py`

3. Fixed summary endpoint contract behavior:
- Non-admin can call summary without `instructor_id` (auto-resolve own instructor).
- Admin still must pass `instructor_id`.
- File: `course/instructor_earnings/views.py`

4. Hardened queryset quality:
- Added `is_deleted=False` in list/detail fetches.
- Added `select_related(...)` and default stable ordering `-earning_date, -id`.
- File: `course/instructor_earnings/services.py`

5. Added DB indexes for list path:
- `(instructor, is_deleted, earning_date)`
- `(instructor, is_deleted, status)`
- `(is_deleted, earning_date)`
- Files:
  - `course/instructor_earnings/models.py`
  - `course/instructor_earnings/migrations/0009_instructorearning_phase_d_indexes.py`

## 3) Expected Outcome After Fix

1. FE page can query `page/page_size/search/sort_by` directly on BE list endpoint.
2. No local filtering on truncated dataset is required for this page.
3. Pagination metadata (`count/next/previous/results`) remains authoritative from BE.
4. Query path is more stable under larger data volume due to tighter queryset and added indexes.

## 4) Residual Notes

1. The page still uses approximated engagement/minutes display logic; this is a product-metric limitation, not a pagination contract issue.
2. Migration `0009` must be applied in deployment environments before evaluating index impact in production.
