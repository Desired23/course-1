# Phase G - Batch Public (Implemented)

Date: 2026-03-11  
Scope: Public `CoursesPage`

## 1) Goal

Remove `server-page + local-filter` mismatch and ensure FE queries BE on page/filter/search/sort with aligned totals.

## 2) Changes

1. FE `CoursesPage` now sends full filter set to BE query:
- `subcategory_ids`, `levels`, `languages`, `duration_buckets`, `certificate`
- File: `src/pages/public/CoursesPage.tsx`

2. FE removed local filtering on `coursesPage.results`:
- Rendering now uses `serverCourses` directly.
- Showing range uses backend result length and backend total count.
- File: `src/pages/public/CoursesPage.tsx`

3. FE service contract extended:
- `CourseListParams` supports new list params above.
- Query built via shared `buildListQuery(...)` for consistency.
- File: `src/services/course.api.ts`

4. BE courses endpoint supports new params:
- `subcategory_ids` (CSV)
- `levels` (CSV)
- `languages` (CSV, case-insensitive OR)
- `duration_buckets` (`short|medium|long`)
- `certificate` (bool)
- Files:
  - `course/courses/views.py`
  - `course/courses/services.py`

## 3) Verification

1. FE build: pass (`npm run build`)
2. BE check: pass (`python manage.py check`)

## 4) Outcome

Public courses listing now follows server-side filtering/pagination semantics for supported filters; total count, page navigation, and result set are backend-authoritative.
