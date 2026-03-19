# Phase E - Gap & Risk Report (Subscription Revenue)

Date: 2026-03-11  
Scope: `InstructorSubscriptionRevenuePage` + `instructor_earnings` BE endpoints

## 1) Executive Priority

1. Data correctness first
2. Then UX consistency
3. Then performance/scalability

## 2) Risk Matrix (Open Gaps)

## Critical

None open in current scope after Phase C/D refactor.

## High

None open after implementing `/api/instructor-earnings/subscription-breakdown/` and migrating FE to this endpoint.

## Medium

1. Period selector (`7d/30d/90d`) does not scope list query:
- Current period affects overview/timeseries, but list query only sends `search/sort/page/page_size`.
- Evidence:
  - Overview uses `period` at `InstructorSubscriptionRevenuePage.tsx:54`
  - List call does not include period/date range at `InstructorSubscriptionRevenuePage.tsx:94`
- Impact: user may assume list is "this period" while data may include all history.

2. Sort options are constrained by BE fields, no longer equivalent to previous FE-only options:
- Old local sort options (`minutes`, `share`) are removed from API-driven sort.
- Impact: behavior change; acceptable technically, but should be explicit in product acceptance.

## Low

1. No request cancellation for rapid search/page interactions:
- Debounce exists, but in-flight request cancellation is not explicit on this page.
- Impact: low risk due to moderate data size and short debounce; mainly optimization concern.

## 3) Risks Closed By Phase C/D Work

1. Closed: FE no longer filters on truncated first page for this screen.
2. Closed: FE now triggers API query on `page/search/sort` changes.
3. Closed: non-admin instructor data scope is enforced server-side.
4. Closed: summary endpoint no longer fails for instructor calls without `instructor_id`.
5. Closed: queryset quality improved (`is_deleted`, `select_related`, stable ordering) and index support added.
6. Closed: list semantics now match "breakdown by course" via server-side aggregation endpoint.
7. Closed: `share %` is now computed from full filtered dataset in BE (not page-local calculation).

## 4) Impact Assessment

1. Data integrity status: improved significantly, but still not fully aligned with "course breakdown" semantics.
2. UX status: paging/filter/search now consistent with BE pagination model.
3. Performance status: improved versus load-all model; further gains depend on fixing aggregation semantics with dedicated aggregated endpoint.

## 5) Recommended Next Actions (for next batch)

1. Add a dedicated BE endpoint for course-aggregated subscription revenue list (group by `course`) with server pagination/filter/sort.
2. Move `share %` calculation to BE based on full filtered dataset totals (not current page totals).
3. Add explicit period/date-range params to the list endpoint and wire FE period selector into list query.
