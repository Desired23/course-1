# URL & Views Audit Report

**Generated:** 2026-02-28  
**Scope:** All apps in `course/` — urls.py, views.py, services.py cross-reference  
**Total Issues Found:** 25

---

## CRITICAL Issues

### 1. `activity_logs` app NOT included in root URL config — entire app unreachable

| Field | Value |
|---|---|
| **File** | `config/urls.py` (missing entry) |
| **Severity** | **CRITICAL** |
| **Description** | The `activity_logs` app has fully implemented `urls.py`, `views.py`, and `services.py`, but is **never included** in `config/urls.py`. The `ActivityLogView` endpoints (`/api/activity-logs/` and `/api/activity-logs/cleanup/`) are completely unreachable. |
| **Suggested Fix** | Add `path('api/', include('activity_logs.urls')),` to `config/urls.py` urlpatterns. |

---

### 2. `support_replies/urls.py` — duplicate URL patterns cause `SupportReplyDetailView` to be permanently unreachable

| Field | Value |
|---|---|
| **File** | `support_replies/urls.py`, lines 6–7 |
| **Severity** | **CRITICAL** |
| **Description** | Two URL patterns resolve identically: `replies/<int:support_id>/` (line 6 → `SupportReplyListView`) and `replies/<int:reply_id>/` (line 7 → `SupportReplyDetailView`). Django matches top-to-bottom, so **`SupportReplyDetailView` can never be reached**. Its `get()` and `delete()` methods are dead code. |
| **Suggested Fix** | Use distinct URL prefixes: e.g. `replies/support/<int:support_id>/` for listing by support ID, and `replies/detail/<int:reply_id>/` for single reply detail/delete. |

---

### 3. `promotions` — URL captures `promotion_id` but view methods don't accept it → `TypeError` at runtime

| Field | Value |
|---|---|
| **File** | `promotions/urls.py` lines 2–3; `promotions/views.py` lines 50, 62 |
| **Severity** | **CRITICAL** |
| **Description** | URLs `promotions/<int:promotion_id>/update` and `promotions/<int:promotion_id>/delete` capture `promotion_id`, but `PromotionManagementView.patch(self, request)` and `.delete(self, request)` do **not** accept a `promotion_id` parameter. When Django dispatches, it passes `promotion_id` as a keyword arg, causing: **`TypeError: patch() got an unexpected keyword argument 'promotion_id'`** on every PATCH/DELETE to these URLs. |
| **Suggested Fix** | Add `promotion_id` parameter to `patch()` and `delete()` method signatures: `def patch(self, request, promotion_id):` and use it directly instead of `request.query_params`. |

---

### 4. `learning_progress/views.py` — unreachable duplicate `except` blocks

| Field | Value |
|---|---|
| **File** | `learning_progress/views.py`, lines 65–68 |
| **Severity** | **CRITICAL** |
| **Description** | In `LearningProgressDetailView.put()`, after the `try/except ValidationError/except Exception` block ends (lines 60–63), there are **two more duplicate `except` blocks** (lines 65–68) at the same indentation. These are outside any `try` statement and will cause a **`SyntaxError`** at module import time, making the entire `learning_progress` app fail to load. |
| **Suggested Fix** | Delete lines 65–68 (the duplicate `except` clauses). |

---

### 5. `supports/urls.py` — DELETE route defined but view has no `delete()` method → 405 error

| Field | Value |
|---|---|
| **File** | `supports/urls.py` line 7; `supports/views.py` |
| **Severity** | **CRITICAL** |
| **Description** | URL `supports/<int:support_id>/delete/` points to `SupportListView`, but the view only has `post`, `get`, `patch`, `put` methods — **no `delete()`**. The service function `delete_support()` exists in `services.py` (line 60) but is not imported in `views.py`. A `DELETE` request returns 405 Method Not Allowed. |
| **Suggested Fix** | Add `delete_support` to the imports and add a `delete()` method to `SupportListView`. |

---

### 6. `support_replies/urls.py` — GET to `/api/replies/` crashes with TypeError (500 error)

| Field | Value |
|---|---|
| **File** | `support_replies/urls.py` line 5; `support_replies/views.py` line 25 |
| **Severity** | **CRITICAL** |
| **Description** | The URL `replies/` maps to `SupportReplyListView`. `POST` works fine (`post(self, request)` has no extra args). But `GET /api/replies/` tries to call `get(self, request, support_id)` — and since the URL captures no `support_id`, Python raises: **`TypeError: get() missing 1 required positional argument: 'support_id'`**, resulting in a 500 server error. |
| **Suggested Fix** | Make `support_id` optional: `def get(self, request, support_id=None):` and handle the `None` case (e.g., return all replies or 400 error), OR split POST and GET into separate URL patterns. |

---

## WARNING Issues

### 7. `notifications/views.py` — `NotificationView` has NO permission checks

| Field | Value |
|---|---|
| **File** | `notifications/views.py`, lines 17–59 |
| **Severity** | **WARNING** |
| **Description** | `NotificationView` (POST create, GET list, PUT mark-as-read) has **no `permission_classes`**. Any unauthenticated user can: create arbitrary notifications, read any user's notifications by passing `?user_id=`, and mark notifications as read. Only `NotificationByAdminView` (line 62) has admin permission. |
| **Suggested Fix** | Add `permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]` to `NotificationView`, and enforce ownership checks in GET/PUT. |

---

### 8. `quiz_results/views.py` — `QuizResultListView` has NO permission checks

| Field | Value |
|---|---|
| **File** | `quiz_results/views.py`, lines 23–60 |
| **Severity** | **WARNING** |
| **Description** | `QuizResultListView` (POST create, GET list, PATCH update, DELETE) has **no `permission_classes`**. Unauthenticated users can create, list, modify, and delete quiz results. |
| **Suggested Fix** | Add `permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]`. |

---

### 9. `instructor_earnings/views.py` — `InstructorEarningsByPayoutView` has auth commented out

| Field | Value |
|---|---|
| **File** | `instructor_earnings/views.py`, line 54 |
| **Severity** | **WARNING** |
| **Description** | `InstructorEarningsByPayoutView` has `# permission_classes = [RolePermissionFactory(["admin", "instructor"])]` **commented out**. The PATCH endpoint at `instructor-earnings/payout/<str:payout_id>/` for updating instructor earnings is accessible **without authentication**. This is a financial operation. |
| **Suggested Fix** | Uncomment the `permission_classes` line. |

---

### 10. `users/views.py` — imports `refresh_token` but no endpoint exists for token refresh

| Field | Value |
|---|---|
| **File** | `users/views.py` line 6; `users/urls.py` |
| **Severity** | **WARNING** |
| **Description** | `refresh_token` is imported from `.services` but never used in any view. The function exists in `services.py` (line 187). There is **no URL endpoint** for token refresh, meaning clients cannot refresh expired JWT tokens via the API. |
| **Suggested Fix** | Create a `UserRefreshTokenView` with a `POST` handler that calls `refresh_token()`, and add a URL route like `path('users/refresh-token', ...)`. Or remove the unused import if refresh is handled another way. |

---

### 11. `courses/views.py` — fragile inline permission pattern

| Field | Value |
|---|---|
| **File** | `courses/views.py`, lines 25, 34, 43 |
| **Severity** | **WARNING** |
| **Description** | `CourseListView` has no class-level `permission_classes`. The `post()`, `patch()`, `delete()` methods set `self.permission_classes` and call `self.check_permissions(request)` inline. This pattern bypasses DRF's standard permission initialization lifecycle and is fragile — if `check_permissions` is forgotten, the method runs unauthenticated. The same pattern is used in `reviews/views.py`. |
| **Suggested Fix** | Override `get_permissions()` to return different permissions per HTTP method, which is the standard DRF approach. |

---

### 12. Inconsistent trailing slashes across apps — potential 404s

| Field | Value |
|---|---|
| **Files** | Multiple `urls.py` files |
| **Severity** | **WARNING** |
| **Description** | URL patterns are inconsistent with trailing slashes. **Without slash:** `users/urls.py` (`users/register`, `users/login`), `courses/urls.py` (`courses/create`), `lessons/urls.py`, `coursemodules/urls.py`, `promotions/urls.py`. **With slash:** `enrollments/urls.py`, `reviews/urls.py`, `learning_progress/urls.py`, `blog_posts/urls.py`, `carts/urls.py`, `wishlists/urls.py`, `qnas/urls.py`, etc. With Django's default `APPEND_SLASH=True`, a request to `/api/users/register/` (with slash) will get a 301 redirect then 404 because the defined route is `/api/users/register` (no slash). |
| **Suggested Fix** | Standardize all URL patterns to use trailing slashes (Django convention). |

---

### 13. `lesson_comments/urls.py` — mixed trailing slashes within the same app

| Field | Value |
|---|---|
| **File** | `lesson_comments/urls.py`, lines 4–8 |
| **Severity** | **WARNING** |
| **Description** | Within one app: `comments/create` (no slash), `comments/<int:comment_id>` (no slash), `comments/<int:comment_id>/manage/` (with slash), `comments/lesson/<int:lesson_id>/` (with slash), `comments/<int:comment_id>/update` (no slash). |
| **Suggested Fix** | Add trailing slashes to all paths. |

---

### 14. `reviews/views.py` — imported service functions never used

| Field | Value |
|---|---|
| **File** | `reviews/views.py`, lines 15–16 |
| **Severity** | **WARNING** |
| **Description** | `count_reviews_by_course` and `count_like_review` are imported from `services.py` but never called in any view method. These functions have no API exposure. |
| **Suggested Fix** | Remove unused imports or create endpoints for them. |

---

### 15. `enrollments/views.py` — imported service functions never used

| Field | Value |
|---|---|
| **File** | `enrollments/views.py`, lines 8–10 |
| **Severity** | **WARNING** |
| **Description** | `find_by_user_and_course`, `count_enrollments_by_course`, and `has_access` are imported but never used in any view. |
| **Suggested Fix** | Remove unused imports. |

---

### 16. `notifications/views.py` — PUT for mark_as_read shares URL vie with POST/GET

| Field | Value |
|---|---|
| **File** | `notifications/urls.py` line 6; `notifications/views.py` line 46 |
| **Severity** | **WARNING** |
| **Description** | `notifications/mark_as_read/` maps to `NotificationView`, which also handles POST (create) and GET (list) on other URL patterns. The `put()` method relies on query params (`notification_id` or `user_id`) to decide behavior. If `PUT /api/notifications/` is sent (the list URL), it will **also** trigger the mark-as-read logic instead of returning 405. PATCH would be more semantically correct for a partial update. |
| **Suggested Fix** | Route `mark_as_read` to a dedicated view class, or use PATCH. |

---

### 17. `payments/views.py` — `VnpayReturnView` is misnamed; actually handles refund operations

| Field | Value |
|---|---|
| **File** | `payments/views.py` lines 48–73; `payments/urls.py` line 6 |
| **Severity** | **WARNING** |
| **Description** | `VnpayReturnView` at `vnpay/return/` has GET/POST/PUT methods that handle **refund operations** (get refund details, submit refund request, cancel refund). The name and URL suggest a VNPay callback, but it's actually a refund management endpoint. |
| **Suggested Fix** | Rename to `RefundManagementView` and use a clearer URL path. |

---

### 18. `payments/views.py` — duplicate refund request logic

| Field | Value |
|---|---|
| **File** | `payments/views.py` lines 58–64 and lines 125–132 |
| **Severity** | **WARNING** |
| **Description** | Both `VnpayReturnView.post()` and `UserRefundListView.post()` call `user_refund_request()` with identical parameters. Two URLs (`vnpay/return/` and `refunds/request/`) do the **exact same thing**, violating DRY. |
| **Suggested Fix** | Remove refund POST logic from `VnpayReturnView`. Keep `refunds/request/` as the canonical endpoint. |

---

## INFO Issues

### 19. `admins/views.py` — unused import

| Field | Value |
|---|---|
| **File** | `admins/views.py`, line 1 |
| **Severity** | INFO |
| **Description** | `from rest_framework import serializers` imported but never used. |
| **Suggested Fix** | Remove the unused import. |

---

### 20. `coursemodules/views.py` — duplicate `ValidationError` import

| Field | Value |
|---|---|
| **File** | `coursemodules/views.py`, lines 2 and 5 |
| **Severity** | INFO |
| **Description** | `from rest_framework.exceptions import ValidationError` imported twice. |
| **Suggested Fix** | Remove the duplicate on line 5. |

---

### 21. `lesson_comments/views.py` — unused import

| Field | Value |
|---|---|
| **File** | `lesson_comments/views.py`, line 1 |
| **Severity** | INFO |
| **Description** | `from rest_framework import serializers` imported but never used. |
| **Suggested Fix** | Remove the unused import. |

---

### 22. `users/views.py` — PATCH update returns `201 CREATED` instead of `200 OK`

| Field | Value |
|---|---|
| **File** | `users/views.py`, line 23 |
| **Severity** | INFO |
| **Description** | `UserManagementView.patch()` (admin update) returns `status.HTTP_201_CREATED` for an update operation. Updates should return 200, not 201. 201 means a new resource was created. |
| **Suggested Fix** | Change to `status.HTTP_200_OK`. |

---

### 23. Response format inconsistency across all apps

| Field | Value |
|---|---|
| **Files** | Multiple `views.py` files |
| **Severity** | INFO |
| **Description** | Error responses use inconsistent keys and wrapping: `{"error": e.detail}` vs `{"errors": e.detail}` vs `{"error": str(e)}` vs `{"errors": str(e)}` vs bare `e.detail`. Within `categories/views.py` alone, some methods use `"error"` and others use `"errors"`. `support_replies/views.py` returns `e.detail` directly without any wrapper dict. |
| **Suggested Fix** | Standardize to a consistent format. Consider a shared error response helper like `def error_response(e, status_code)`. |

---

### 24. `blog_posts/views.py` — `ClientBlogPostView` requires auth for reading published posts

| Field | Value |
|---|---|
| **File** | `blog_posts/views.py`, line 49 |
| **Severity** | INFO |
| **Description** | `ClientBlogPostView` requires `['admin', 'instructor', 'student']` permissions. Unauthenticated visitors **cannot read published blog posts**. Blog posts are typically public content. |
| **Suggested Fix** | Remove `permission_classes` or use `AllowAny` for the GET method. |

---

### 25. `categories/views.py` — `CategoryListView` restricts access to admin/instructor only

| Field | Value |
|---|---|
| **File** | `categories/views.py`, line 19 |
| **Severity** | INFO |
| **Description** | `CategoryListView` requires `['admin', 'instructor']`. Students cannot browse the main category list (only `ActiveCategoryListView` is public). If students need category browsing, this is overly restrictive. |
| **Suggested Fix** | Add `'student'` to allowed roles or make it public, depending on requirements. |

---

## Summary

| Severity | Count |
|---|---|
| **CRITICAL** | 6 |
| **WARNING** | 12 |
| **INFO** | 7 |
| **Total** | **25** |

### Critical Issues Quick Reference

| # | App | Issue | Impact |
|---|---|---|---|
| 1 | `activity_logs` | Not in root `urls.py` | Entire app unreachable |
| 2 | `support_replies` | Duplicate URL patterns | `SupportReplyDetailView` dead code |
| 3 | `promotions` | URL params not in method signature | `TypeError` crash on PATCH/DELETE |
| 4 | `learning_progress` | Duplicate except blocks | `SyntaxError` at import |
| 5 | `supports` | No `delete()` method | DELETE returns 405 |
| 6 | `support_replies` | GET `/replies/` missing arg | 500 server error |
