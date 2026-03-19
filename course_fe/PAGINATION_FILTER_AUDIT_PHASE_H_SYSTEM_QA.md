# Phase H - System QA (Post-Phase G)

Date: 2026-03-11  
Scope: Refactored list flows in Public, Instructor, Admin; spot-check User list flows.

## 1) QA Checklist Results

## A. FE/BE count + pagination alignment

1. Public `CoursesPage`: PASS
- FE reads backend `count/total_pages/results`.
- BE supports sent filters and paginates via shared paginator.

2. Instructor `Subscription Revenue`: PASS
- FE uses paginated aggregated endpoint `/instructor-earnings/subscription-breakdown/`.
- BE returns `count/total_pages/results` and global `share_pct`.

3. Instructor `Dashboard` course list: PASS
- FE now server-queries list on page/filter/search/sort.
- Local slice/filter removed from list table path.

4. Admin `Dashboard` users/courses tables: PASS
- Load-all pattern removed.
- FE now queries first paginated page with server search.

## B. Cross-filter behavior

1. Public `CoursesPage`: PASS
- Filter params sent to BE: `category_id`, `subcategory_ids`, `levels`, `rating_min`, `languages`, `duration_buckets`, `certificate`, `price_min/max`, `ordering`, `search`.

2. Subscription revenue breakdown: PASS
- Server-side `search` + whitelisted `sort_by` on aggregate queryset.

## C. Last page / empty state

1. Public `CoursesPage`: PASS
- Uses BE totals and renders empty state if `serverCourses.length === 0`.

2. Subscription revenue: PASS
- Empty table row shown when no result.

3. Instructor dashboard courses: PASS
- Empty state shown when result list is empty.

## D. Network/error handling

1. Public/Instructor/Admin pages: PARTIAL PASS
- All checked pages have `catch` paths and loading toggles.
- No unified error UX across all pages yet (inconsistent toast/banner style).

## 2) Regression Smoke

1. `npm run build`: PASS  
2. `python manage.py check`: PASS  
3. `python manage.py test`: PASS (but **0 tests discovered**)

## 3) Residual Risks

1. Automated regression depth is low because backend/frontend test suites are effectively absent (`0 tests`).
2. Some non-targeted admin pages still use load-all + local filtering patterns (outside this QA scope).
3. Runtime API latency/concurrency behavior was not load-tested in this pass.

## 4) Conclusion

For the refactored Phase G flows, FE/BE pagination and filter contracts are consistent and functioning by code-path verification plus build/check smoke.  
Primary remaining risk is test coverage, not contract mismatch on audited pages.
