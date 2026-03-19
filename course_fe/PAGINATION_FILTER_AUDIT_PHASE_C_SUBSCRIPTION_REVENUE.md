# Phase C - FE Implementation Audit (Subscription Revenue)

Date: 2026-03-11  
Scope: `InstructorSubscriptionRevenuePage`

## 1) Page Under Audit

- Domain: Instructor
- Route: `/instructor/subscription-revenue`
- Page component: `src/pages/instructor/InstructorSubscriptionRevenuePage.tsx`

## 2) FE -> Service -> API Mapping

| Page | FE Service | API Endpoint | Purpose | List-type |
|---|---|---|---|---|
| `InstructorSubscriptionRevenuePage` | `getAllInstructorEarnings({ source: 'subscription' })` | `GET /api/instructor-earnings/?source=subscription&page=<n>&page_size=100` | Load earnings rows used for course breakdown table | Paginated list (auto-loop all pages in FE helper) |
| `InstructorSubscriptionRevenuePage` | `getInstructorDashboardStats()` | `GET /api/instructor/dashboard/stats/` | Student totals / course stats enrichment | Non-list stats |
| `InstructorSubscriptionRevenuePage` | `getInstructorAnalyticsTimeseries(months)` | `GET /api/instructor/analytics/timeseries/?months=<n>` | Chart time-series | Non-list analytics |
| `InstructorSubscriptionRevenuePage` | `getInstructorEarningsSummary()` | `GET /api/instructor-earnings/summary/` | Summary call in page load | Non-list summary |

## 3) Phase C Classification (Current FE Behavior)

| Check item | Current status | Evidence |
|---|---|---|
| Local filter/sort | Yes | `filteredBreakdown = [...courseBreakdown].filter(...).sort(...)` in `InstructorSubscriptionRevenuePage.tsx:113` |
| Local pagination | Yes | `ITEMS_PER_PAGE = 8` + `slice(...)` in `InstructorSubscriptionRevenuePage.tsx:125` |
| Only fetch first page from BE | No | `getAllInstructorEarnings` loops with `page++` until `!res.next` in `instructor-earnings.api.ts:99` |
| UI page change triggers BE query by `page` | No | `UserPagination` updates local `currentPage` only; no API call tied to `currentPage` |

## 4) FE Deviations For This Page

| Page | Deviation | Impact level | Impact detail |
|---|---|---|---|
| `InstructorSubscriptionRevenuePage` | FE performs search/sort/pagination locally after loading full dataset | Medium | Works functionally but scales poorly with large earnings volume; no true server-side paging UX |
| `InstructorSubscriptionRevenuePage` | UI pagination is not BE pagination | Medium | Switching page in UI does not fetch next BE page; data freshness and latency patterns differ from standard list pages |
| `InstructorSubscriptionRevenuePage` | `getInstructorEarningsSummary()` called without `instructor_id` and returned value not used | High | BE view currently requires `instructor_id`; this can fail the whole `Promise.all` and block page data load |

## 5) Conclusion For Phase C (This Page)

`InstructorSubscriptionRevenuePage` is currently a **load-all + local-filter + local-pagination** page, not a server-driven paginated list page.

This page should be marked as **non-compliant** with the target "call API đúng theo page/filter" standard for large list flows.
