# Django Models Audit Report

**Project:** `course-1/course/`  
**Django Version:** 5.2  
**DEFAULT_AUTO_FIELD:** `django.db.models.BigAutoField`  
**Date:** 2026-02-28  

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3     |
| WARNING  | 13    |
| INFO     | 4     |

---

## CRITICAL Issues

### C-1. `Enrollment.__str__` defined outside class body

- **File:** `enrollments/models.py`, lines 53–54
- **Severity:** CRITICAL
- **Description:** The `__str__` method is indented at module level, not inside the `Enrollment` class. This means the model has **no** `__str__` representation, and calling `str(enrollment_instance)` returns the default `Enrollment object (pk)`. The orphaned function `__str__(self)` at module level is dead code.
- **Code:**
  ```python
          ]

  def __str__(self):          # ← module-level, NOT inside class
      return f"Enrollment {self.status} - {self.certificate}"
  ```
- **Fix:** Indent the method one level so it sits inside `class Enrollment`:
  ```python
      def __str__(self):
          return f"Enrollment {self.status} - {self.certificate}"
  ```

---

### C-2. `Support.status` default value doesn't match choices (case mismatch)

- **File:** `supports/models.py`, line 27
- **Severity:** CRITICAL
- **Description:** The `STATUS_CHOICES` are all lowercase (`'open'`, `'in_progress'`, `'resolved'`, `'closed'`), but the field default is `'Open'` (uppercase O). Any newly created `Support` object will have `status='Open'`, which is **not a valid choice** and will fail Django form/serializer validation.
- **Code:**
  ```python
  status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
  ```
- **Fix:**
  ```python
  status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
  ```

---

### C-3. `Support.priority` default value doesn't match choices (case mismatch)

- **File:** `supports/models.py`, line 28
- **Severity:** CRITICAL
- **Description:** Same issue as C-2. `PRIORITY_CHOICES` are lowercase (`'low'`, `'medium'`, `'high'`, `'urgent'`) but the default is `'Medium'` (uppercase M).
- **Code:**
  ```python
  priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
  ```
- **Fix:**
  ```python
  priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
  ```

---

## WARNING Issues

### W-1. `Cart.promotion` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `carts/models.py`, lines 11–15
- **Severity:** WARNING
- **Description:** The `promotion` FK is `null=True, blank=True` (optional), but uses `on_delete=CASCADE`. If a promotion is deleted, **all cart items** referencing that promotion are silently deleted. Cart items should survive promotion deletion.
- **Code:**
  ```python
  promotion = models.ForeignKey(
      Promotion, on_delete=models.CASCADE,
      related_name='cart_promotion', null=True, blank=True
  )
  ```
- **Fix:** Change to `on_delete=models.SET_NULL`.

---

### W-2. `Course.instructor` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `courses/models.py`, line 30
- **Severity:** WARNING
- **Description:** `instructor` is `null=True` (course can exist without instructor), but `on_delete=CASCADE` means deleting an instructor **deletes all their courses**. Courses are high-value data; this should preserve them.
- **Fix:** Change to `on_delete=models.SET_NULL`.

---

### W-3. `Course.category` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `courses/models.py`, line 31
- **Severity:** WARNING
- **Description:** `category` is `null=True` but `on_delete=CASCADE`. Deleting a category **deletes all courses** in it.
- **Fix:** Change to `on_delete=models.SET_NULL`.

---

### W-4. `Course.subcategory` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `courses/models.py`, line 32
- **Severity:** WARNING
- **Description:** Same pattern as W-3.
- **Fix:** Change to `on_delete=models.SET_NULL`.

---

### W-5. `CourseModule.course` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `coursemodules/models.py`, line 11
- **Severity:** WARNING
- **Description:** `course` is `null=True, blank=True` (module can exist without course), but `on_delete=CASCADE`. If a course is deleted, all its modules are cascade-deleted. If `null=True` is intentional, the delete behavior should be `SET_NULL`.
- **Fix:** Either remove `null=True, blank=True` (if modules must always belong to a course and cascade is desired), or change to `on_delete=models.SET_NULL`.

---

### W-6. `Enrollment.course` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `enrollments/models.py`, line 21
- **Severity:** WARNING
- **Description:** `course` is `null=True, blank=True` (enrollment can exist without course?), but `on_delete=CASCADE`. Enrollment records are critical business data (proof of purchase). Deleting a course should not destroy enrollment history.
- **Fix:** Change to `on_delete=models.SET_NULL`, or remove `null=True` and keep CASCADE if enrollments should always have a course.

---

### W-7. `BlogPost.author` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `blog_posts/models.py`, line 15
- **Severity:** WARNING
- **Description:** `author` is `null=True, blank=True` (anonymous posts allowed?), but `on_delete=CASCADE`. Deleting a user **deletes all their blog posts**.
- **Fix:** Change to `on_delete=models.SET_NULL`.

---

### W-8. `BlogPost.category` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `blog_posts/models.py`, lines 28–32
- **Severity:** WARNING
- **Description:** `category` is `null=True, blank=True` but `on_delete=CASCADE`. Deleting a category **removes all blog posts** in it.
- **Fix:** Change to `on_delete=models.SET_NULL`.

---

### W-9. `Forum.course` — `on_delete=CASCADE` on optional ForeignKey

- **File:** `forums/models.py`, line 13
- **Severity:** WARNING
- **Description:** `course` is `null=True, blank=True` (general forums), but `on_delete=CASCADE`. Deleting a course **deletes Forum + all topics + all comments** through cascade chain.
- **Fix:** Change to `on_delete=models.SET_NULL`.

---

### W-10. `InstructorEarning.unique_together` with nullable fields

- **File:** `instructor_earnings/models.py`, lines 53–56
- **Severity:** WARNING
- **Description:** Two `unique_together` constraints include nullable fields (`payment` and `user_subscription`). In PostgreSQL, NULL values are treated as **distinct** in unique indexes. This means multiple rows with `(payment=NULL, course=X, instructor=Y)` will **NOT** violate the constraint, potentially allowing duplicate earnings records.
- **Code:**
  ```python
  unique_together = [
      ('payment', 'course', 'instructor'),
      ('user_subscription', 'course', 'instructor'),
  ]
  ```
- **Fix:** Use `UniqueConstraint` with `condition` to exclude NULLs, or use a partial unique index, or add application-level validation.

---

### W-11. `CourseSubscriptionConsent.instructor` points to `User` instead of `Instructor`

- **File:** `subscription_plans/models.py`, lines 160–163
- **Severity:** WARNING
- **Description:** The field is named `instructor` but references `User` model. The `related_name='course_subscription_consents'` is set on `User`, not `Instructor`. Every other model in the project that needs an instructor reference uses the `Instructor` model (which has a OneToOne to User).
- **Code:**
  ```python
  instructor = models.ForeignKey(
      User, on_delete=models.CASCADE,
      related_name='course_subscription_consents'
  )
  ```
- **Fix:** Change to reference `'instructors.Instructor'`:
  ```python
  instructor = models.ForeignKey(
      'instructors.Instructor', on_delete=models.CASCADE,
      related_name='course_subscription_consents'
  )
  ```

---

### W-12. `Category.parent_category` — `on_delete=CASCADE` on self-referential nullable FK

- **File:** `categories/models.py`, lines 12–14
- **Severity:** WARNING
- **Description:** Deleting a parent category **cascade-deletes all subcategories**, which in turn cascade-deletes all courses, blog posts, and promotions linked to those subcategories. This creates a deep cascade chain that could wipe significant data from a single category deletion.
- **Fix:** Consider `on_delete=models.SET_NULL` to orphan subcategories instead of deleting them.

---

### W-13. `LessonComment.parent_comment` — `on_delete=CASCADE` on optional self-FK

- **File:** `lesson_comments/models.py`, line 8
- **Severity:** WARNING
- **Description:** `parent_comment` is `null=True, blank=True` but `on_delete=CASCADE`. Deleting a top-level comment silently deletes its **entire reply tree**. Combined with no soft-delete fields on this model (unlike all other models), this is permanent data loss.
- **Fix:** Change to `on_delete=models.SET_NULL` to preserve replies even if the parent is deleted, or add soft-delete fields.

---

## INFO Issues

### I-1. `ActivityLog.trace_id` — `UUIDField` with unused `max_length` parameter

- **File:** `activity_logs/models.py`, line 24
- **Severity:** INFO
- **Description:** `models.UUIDField(max_length=100, ...)` — Django's `UUIDField` does not use `max_length`. The parameter is silently ignored. On PostgreSQL it maps to a native UUID column; on other backends it uses `char(32)`.
- **Code:**
  ```python
  trace_id = models.UUIDField(max_length=100, null=True, blank=True)
  ```
- **Fix:** Remove `max_length`:
  ```python
  trace_id = models.UUIDField(null=True, blank=True)
  ```

---

### I-2. `promotions/models.py` — duplicate import

- **File:** `promotions/models.py`, lines 5–6
- **Severity:** INFO
- **Description:** `from instructors.models import Instructor` is imported **twice** on consecutive lines.
- **Fix:** Remove the duplicate import on line 6.

---

### I-3. `wishlists/models.py` — unused import

- **File:** `wishlists/models.py`, line 4
- **Severity:** INFO
- **Description:** `from promotions.models import Promotion` is imported but **never used** in the model. This adds an unnecessary import chain dependency.
- **Fix:** Remove the unused import.

---

### I-4. `Payment_Details` and `ApplicationResponse` — missing explicit primary key (PK type inconsistency)

- **Files:** `payment_details/models.py`, `applications/models.py` (ApplicationResponse)
- **Severity:** INFO
- **Description:** Every other model in the project explicitly declares `id = models.AutoField(primary_key=True)` (32-bit int). These two models omit the explicit PK, so Django uses the project's `DEFAULT_AUTO_FIELD = BigAutoField` (64-bit int). While no other models currently reference these by FK, this is an inconsistency that could cause column type mismatches if FKs are added later.
- **Fix:** Add explicit `id = models.AutoField(primary_key=True)` for consistency, or change all other models to omit it and rely on `DEFAULT_AUTO_FIELD`.

---

## Cross-Reference: Import Chain Analysis

No circular imports detected. All model import chains terminate cleanly:

| Model File | Direct Model Imports |
|---|---|
| `users/models.py` | *(none)* |
| `instructor_levels/models.py` | *(none — uses string ref `'users.User'`)* |
| `categories/models.py` | *(none)* |
| `instructors/models.py` | `User`, `InstructorLevel` |
| `courses/models.py` | `Instructor`, `Category` |
| `coursemodules/models.py` | `Course` |
| `lessons/models.py` | `CourseModule` |
| `enrollments/models.py` | `User`, `Course` *(string refs for Payment, UserSubscription)* |
| `learning_progress/models.py` | `Enrollment`, `Lesson`, `User`, `Course` |
| `payments/models.py` | `User`, `Course`, `Promotion` |
| `payment_details/models.py` | `Payment`, `Course`, `Promotion` |
| `instructor_payouts/models.py` | `Instructor`, `Admin` |
| `instructor_earnings/models.py` | `Instructor`, `Course`, `Payment`, `InstructorPayout` |
| `subscription_plans/models.py` | `User`, `Course`, `Payment`, `Enrollment` |

All cross-app references that could cause circular imports correctly use **string references** (e.g., `'payments.Payment'`, `'subscription_plans.UserSubscription'`).

---

## Models Without Soft-Delete Fields

The following model(s) lack the `deleted_at` / `deleted_by` / `is_deleted` soft-delete pattern used by **all** other models in the project:

| Model | File |
|---|---|
| `LessonComment` | `lesson_comments/models.py` |
| `ApplicationResponse` | `applications/models.py` |

This means records in these tables can only be **hard-deleted**, which is inconsistent with the project's soft-delete convention.
