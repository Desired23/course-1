# Services.py Audit Report

**Generated:** 2026-02-28  
**Scope:** All `services.py` + `dashboard_services.py` files across 37+ apps  

---

## CRITICAL Issues

### 1. `quiz_results/services.py` Line 30 — Non-existent model field `question_id`

**Severity:** CRITICAL  
**File:** `course/quiz_results/services.py`  
**Line:** 30  

```python
student_answer = answers.get(str(question.question_id))
```

`QuizQuestion` model uses `id` (AutoField) as primary key, not `question_id`. This field does not exist and will raise `AttributeError` at runtime, meaning `calculate_quiz_evaluation` always crashes.

**Fix:** Change to `question.id`:
```python
student_answer = answers.get(str(question.id))
```

---

### 2. `quiz_results/services.py` Line 332 — `timezone.timedelta` does not exist

**Severity:** CRITICAL  
**File:** `course/quiz_results/services.py`  
**Line:** ~332  

```python
'start_time': timezone.now() - timezone.timedelta(seconds=time_spent),
```

`django.utils.timezone` does not export `timedelta`. This raises `AttributeError: module 'django.utils.timezone' has no attribute 'timedelta'`. The `submit_quiz` function will crash every time.

**Fix:** Import and use `datetime.timedelta`:
```python
from datetime import timedelta
# ...
'start_time': timezone.now() - timedelta(seconds=time_spent),
```

---

### 3. `instructor_earnings/services.py` Lines 148-153 — `timezone.timedelta` does not exist

**Severity:** CRITICAL  
**File:** `course/instructor_earnings/services.py`  
**Lines:** ~148-153  

```python
refund_time = timezone.now() - timezone.timedelta(days=refund_days)
# ...
sub_settle_time = timezone.now() - timezone.timedelta(days=1)
```

Same issue as above — `timezone.timedelta` doesn't exist in `django.utils.timezone`. The `update_earnings_available()` cron job will always crash.

**Fix:** Import `timedelta` from `datetime`:
```python
from datetime import timedelta
# ...
refund_time = timezone.now() - timedelta(days=refund_days)
sub_settle_time = timezone.now() - timedelta(days=1)
```

---

### 4. `instructor_earnings/services.py` Lines 115-127 — Wrong field names in ORM query

**Severity:** CRITICAL  
**File:** `course/instructor_earnings/services.py`  
**Lines:** ~115-127  

```python
payout = InstructorPayout.objects.prefetch_related(
    'earnings__instructor_id__user_id'      # WRONG: fields are 'instructor' and 'user'
).get(instructor_payout=payout_id)           # WRONG: field is 'id', not 'instructor_payout'
```

Three bugs in two lines:
1. `'earnings__instructor_id__user_id'` — The FK field names are `instructor` and `user`, not `instructor_id` and `user_id`. Django ORM traversal uses the field name, not the DB column.
2. `.get(instructor_payout=payout_id)` — `InstructorPayout` has no field `instructor_payout`. The PK is `id`.
3. Line ~137: `earning.instructor_payout_id = assign_payout` assigns a model instance to the `_id` field (which expects an integer).

**Fix:**
```python
payout = InstructorPayout.objects.prefetch_related(
    'earnings__instructor__user'
).get(id=payout_id)
# ...
earning.instructor_payout = assign_payout  # not instructor_payout_id
```

---

### 5. `admins/dashboard_services.py` Lines 133-138 — Wrong related_name for Review → Course

**Severity:** CRITICAL  
**File:** `course/admins/dashboard_services.py`  
**Lines:** ~133-138  

```python
.annotate(
    enrollment_count=Count('enrollment_course', ...),
    avg_rating=Avg('reviews__rating', filter=Q(reviews__is_deleted=False, reviews__status='approved')),
)
```

The `Review` model FK to `Course` uses `related_name='reviews_course'`, NOT `reviews`. This query silently produces wrong results or raises `FieldError`.

**Fix:**
```python
avg_rating=Avg('reviews_course__rating', filter=Q(reviews_course__is_deleted=False, reviews_course__status='approved')),
```

---

### 6. `instructors/dashboard_services.py` Line 77 — Non-existent QnA status `'unanswered'`

**Severity:** CRITICAL  
**File:** `course/instructors/dashboard_services.py`  
**Line:** ~77  

```python
pending_questions = Qna.objects.filter(
    course_id__in=course_ids, is_deleted=False, status='unanswered'
).count()
```

`QnA.StatusChoices` values are `'Pending'`, `'Answered'`, `'Closed'`. There is no `'unanswered'` status. This always returns 0.

**Fix:**
```python
pending_questions = Qna.objects.filter(
    course_id__in=course_ids, is_deleted=False, status='Pending'
).count()
```

---

### 7. `subscription_plans/services.py` ~Line 257 — Wrong field name `payment.status`

**Severity:** CRITICAL  
**File:** `course/subscription_plans/services.py`  
**Line:** ~257 (inside `subscribe_to_plan`)  

```python
if payment.status != 'completed':
```

The `Payment` model uses `payment_status`, not `status`. This raises `AttributeError` whenever a `payment_id` is provided to `subscribe_to_plan`.

**Fix:**
```python
if payment.payment_status != 'completed':
```

---

### 8. `learning_progress/services.py` Lines 153-158 — Attribute access on dict object

**Severity:** CRITICAL  
**File:** `course/learning_progress/services.py`  
**Lines:** ~153-158 (inside `get_learning_progress`)  

```python
def get_learning_progress(data):
    learning_progress = LearningProgress.objects.get(
        enrollment=data.enrollment_id,
        lesson=data.lesson_id
    )
```

Uses dot notation (`data.enrollment_id`, `data.lesson_id`) on what is typically request data (a dict). This will raise `AttributeError`. 

**Fix:**
```python
learning_progress = LearningProgress.objects.get(
    enrollment=data.get('enrollment_id') or data.get('enrollment'),
    lesson=data.get('lesson_id') or data.get('lesson')
)
```

---

### 9. `learning_progress/services.py` Lines 16-32 — Missing required `enrollment` field

**Severity:** CRITICAL  
**File:** `course/learning_progress/services.py`  
**Lines:** 16-32 (inside `update_learning_progress`)  

```python
learning_progress, created = LearningProgress.objects.get_or_create(
    user=user,
    lesson=lesson,
    defaults={
        'course': course,
        'progress_percentage': ...,
        # 'enrollment' is MISSING
    }
)
```

The `LearningProgress` model has `enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, ...)` which is NOT NULL. When creating a new record, the missing `enrollment` will cause `IntegrityError`.

Note: The `update_lesson_progress` function two blocks below correctly includes `enrollment` in defaults. This function does not.

**Fix:** Add enrollment lookup and include it in defaults:
```python
enrollment = Enrollment.objects.filter(user=user, course=course, is_deleted=False).first()
if not enrollment:
    raise ValidationError({"enrollment": "User is not enrolled in the course."})
# Then include 'enrollment': enrollment in defaults
```

---

### 10. `reviews/services.py` Lines 26-29 — Counter incremented before review save, no atomicity

**Severity:** CRITICAL  
**File:** `course/reviews/services.py`  
**Lines:** 26-29  

```python
if serializer.is_valid(raise_exception=True):
    course.total_reviews += 1
    course.save()
    review = serializer.save()
```

Two issues:
1. `total_reviews` is incremented BEFORE `serializer.save()`. If `save()` fails (DB constraint, etc.), the counter is already wrong.
2. No `transaction.atomic()` wrapping — the counter and review save are not atomic.
3. `+= 1` is not safe under concurrent writes (race condition, see WARNING #1).

**Fix:** Use `transaction.atomic()` and `F()` expression, and increment after save:
```python
from django.db.models import F
from django.db import transaction

with transaction.atomic():
    review = serializer.save()
    Course.objects.filter(id=data['course_id']).update(total_reviews=F('total_reviews') + 1)
```

---

## WARNING Issues

### 11. `enrollments/services.py` Lines 14-26 — Race condition on `total_students` counter

**Severity:** WARNING  
**File:** `course/enrollments/services.py`  
**Lines:** ~14-26  

```python
course = Course.objects.get(id=dataCopy.get('course_id'))
course.total_students += 1
course.save()
```

Under concurrent enrollment requests, multiple processes can read the same `total_students` value, each increment by 1, and write the same result — losing increments. Also no `transaction.atomic()`.

**Fix:**
```python
from django.db.models import F
Course.objects.filter(id=dataCopy.get('course_id')).update(total_students=F('total_students') + 1)
```

---

### 12. `enrollments/services.py` Line 11 — Naive datetime instead of timezone-aware

**Severity:** WARNING  
**File:** `course/enrollments/services.py`  
**Line:** 11  

```python
'enrollment_date': datetime.now(),
```

Uses `datetime.now()` which returns a naive datetime without timezone info. Django recommends `timezone.now()` for timezone-aware datetimes. This will cause `RuntimeWarning` if `USE_TZ = True`.

**Fix:**
```python
from django.utils import timezone
'enrollment_date': timezone.now(),
```

---

### 13. `reviews/services.py` Line 65 — Race condition on `likes` counter

**Severity:** WARNING  
**File:** `course/reviews/services.py`  
**Line:** ~65  

```python
def count_like_review(review_id):
    review = Review.objects.get(id=review_id)
    review.likes += 1
    review.save()
```

Same read-increment-write race condition under concurrent "like" operations.

**Fix:**
```python
Review.objects.filter(id=review_id).update(likes=F('likes') + 1)
```

---

### 14. `instructors/services.py` Lines 36-48 — Non-atomic user_type update

**Severity:** WARNING  
**File:** `course/instructors/services.py`  
**Lines:** 36-48  

```python
user_instance.user_type = User.UserTypeChoices.INSTRUCTOR
user_instance.save()                  # <-- user_type changed
# ...
serializer = InstructorSerializers(data=modified_data, context={'request': None})
if serializer.is_valid(raise_exception=True):
    instructor = serializer.save()    # <-- could fail
```

The user type is changed to INSTRUCTOR and saved BEFORE the instructor object is created. If the instructor serializer validation or save fails, the user type remains as INSTRUCTOR with no actual Instructor record — broken state.

**Fix:** Wrap in `transaction.atomic()`:
```python
from django.db import transaction

with transaction.atomic():
    user_instance.user_type = User.UserTypeChoices.INSTRUCTOR
    user_instance.save()
    serializer = InstructorSerializers(data=modified_data, ...)
    if serializer.is_valid(raise_exception=True):
        instructor = serializer.save()
```

---

### 15. `learning_progress/services.py` Lines 67-72 — Enrollment check before null course check

**Severity:** WARNING  
**File:** `course/learning_progress/services.py`  
**Lines:** ~67-72 (inside `update_lesson_progress`)  

```python
course = lesson.coursemodule.course if lesson.coursemodule else None
enrollment = Enrollment.objects.filter(user=user, course=course, is_deleted=False).first()
if not enrollment:
    raise ValidationError(...)
if not course:
    raise ValidationError({"lesson_id": "Lesson does not belong to any course."})
```

The enrollment query is executed with `course=None` before the null course check. This logic is reversed — the null course check should come first.

**Fix:** Swap the order — check `course` before querying enrollment.

---

### 16. `instructors/dashboard_services.py` Lines 81-106 — N+1 query in per-course stats

**Severity:** WARNING  
**File:** `course/instructors/dashboard_services.py`  
**Lines:** ~81-106  

```python
for course in courses_qs.order_by('-created_at'):
    c_enrollments = Enrollment.objects.filter(course=course, ...)  # query per course
    c_new = c_enrollments.filter(...).count()                     # query per course
    c_total = c_enrollments.count()                                # query per course
    c_reviews = Review.objects.filter(course=course, ...)          # query per course
    c_rating = c_reviews.aggregate(...)                            # query per course
    c_earnings = earnings_qs.filter(course=course).aggregate(...)  # query per course
```

6+ queries per course in the loop. For an instructor with 20 courses, this is 120+ queries.

**Fix:** Use annotation on the queryset:
```python
courses_qs.annotate(
    c_total=Count('enrollment_course', filter=Q(enrollment_course__is_deleted=False)),
    c_rating=Avg('reviews_course__rating', filter=Q(reviews_course__is_deleted=False, reviews_course__status='approved')),
    # ...
)
```

---

### 17. `learning_progress/services.py` Lines 217-225 — N+1 query in learning streak calculation

**Severity:** WARNING  
**File:** `course/learning_progress/services.py`  
**Lines:** ~217-225 (inside `get_student_stats`)  

```python
while True:
    has_activity = LearningProgress.objects.filter(
        user=user, is_deleted=False, last_accessed__date=check_date,
    ).exists()
    if not has_activity:
        break
    streak_days += 1
    check_date -= timedelta(days=1)
```

Executes one DB query per day of the streak. A student with a 365-day streak = 365 queries.

**Fix:** Fetch distinct activity dates in one query:
```python
activity_dates = set(
    LearningProgress.objects.filter(user=user, is_deleted=False)
    .values_list('last_accessed__date', flat=True).distinct()
)
today = timezone.now().date()
streak_days = 0
check_date = today
while check_date in activity_dates:
    streak_days += 1
    check_date -= timedelta(days=1)
```

---

### 18. `notifications/services.py` Lines 77-103 — N+1 in `notification_to_users`

**Severity:** WARNING  
**File:** `course/notifications/services.py`  
**Lines:** 77-103  

```python
for uid in user_ids:
    serializer = NotificationSerializer(data=data)
    if serializer.is_valid():
        serializer.save()  # 1 INSERT per user
```

Creates one notification per user in a loop. For 1000 users = 1000 individual INSERT queries.

**Fix:** Use `Notification.objects.bulk_create()` for the DB inserts, then send WebSocket messages in a loop.

---

### 19. `admins/services.py` Lines 4-33 — Double try/except swallows structured errors

**Severity:** WARNING  
**File:** `course/admins/services.py`  
**Lines:** 4-33  

```python
def create_admin(data, request=None):
    try:
        try:
            userCheck = User.objects.get(id=data['user_id'])
        except User.DoesNotExist:
            raise ValidationError({"error": "User not found."})
        # ...
    except Exception as e:
        raise ValidationError(f"Error creating admin: {str(e)}")  # wraps ALL errors as string
```

The outer `except Exception` catches `ValidationError` from the inner block and re-wraps it as a plain string, losing the structured error format (dict → string).

**Fix:** Add `except ValidationError: raise` before the `except Exception` block, or remove the outer try/except.

---

### 20. `blog_posts/services.py` Lines 23-24 — Re-wrapping ValidationError

**Severity:** WARNING  
**File:** `course/blog_posts/services.py`  
**Lines:** 23-24  

```python
except ValidationError as e:
    raise ValidationError({"error": str(e)})
```

`create_blog_post` catches `ValidationError` and re-wraps it, destroying the original error structure. This also catches its own deliberately-raised `ValidationError(serializer.errors)` from line 20.

**Fix:** Remove the `except ValidationError` clause or re-raise without wrapping.

---

### 21. `carts/services.py` Lines 27-29 — Dead exception handler

**Severity:** WARNING  
**File:** `course/carts/services.py`  
**Lines:** 27-29  

```python
def get_cart_by_user(user_id):
    try:
        cart = Cart.objects.filter(user=user_id)  # .filter() never raises DoesNotExist
        return cart
    except Cart.DoesNotExist:  # DEAD CODE — never reached
        raise ValidationError({"error": "Cart not found for this user."})
```

`.filter()` returns an empty queryset if no results, never raises `DoesNotExist`. The except clause is dead code — empty carts are silently returned.

**Fix:** Either use `.get()` if you expect exactly one, or remove the try/except and return the queryset (possibly empty).

---

### 22. `users/services.py` Line 99 — Unguarded `data['password']` access

**Severity:** WARNING  
**File:** `course/users/services.py`  
**Line:** ~99 (inside `register`)  

```python
data['password_hash'] = make_password(data['password'])
```

`data['password']` will raise `KeyError` if the key is missing. This runs BEFORE serializer validation, so the user gets an unhelpful 500 error instead of a proper validation message.

**Fix:** Validate presence first or use `data.get('password')` with a check:
```python
password = data.get('password')
if not password:
    raise ValidationError({"password": "Password is required."})
data['password_hash'] = make_password(password)
```

---

### 23. `instructor_payouts/services.py` Lines 1-18 — Duplicate imports

**Severity:** WARNING  
**File:** `course/instructor_payouts/services.py`  
**Lines:** 1-18  

```python
from django.db import transaction          # line 4
from django.utils import timezone          # line 5
from django.db.models import Sum           # line 8
from decimal import Decimal                # line 9
from collections import defaultdict        # line 10
from django.db import transaction          # line 11 — DUPLICATE
from django.utils import timezone          # line 12 — DUPLICATE
from django.db.models import Sum           # line 13 — DUPLICATE
from decimal import Decimal                # line 14 — DUPLICATE
from collections import defaultdict        # line 15 — DUPLICATE
from .models import InstructorPayout       # line 16 — DUPLICATE (also line 7)
from instructor_earnings.models import ... # line 17 — DUPLICATE (also line 6)
from .serializers import ...               # line 18 — DUPLICATE (also line 2)
```

All imports in lines 11-18 are exact duplicates of lines 1-10. Suggests a copy-paste error.

**Fix:** Remove lines 11-18.

---

### 24. `instructor_payouts/services.py` `auto_create_instructor_payouts` — Race condition in payout-to-instructor mapping

**Severity:** WARNING  
**File:** `course/instructor_payouts/services.py`  
**Lines:** ~56-75  

```python
InstructorPayout.objects.bulk_create(payouts_to_create)
created_payouts = InstructorPayout.objects.filter(
    status=InstructorPayout.PayoutStatusChoices.PENDING,
    processed_by=processed_by,
    period=period or timezone.now().strftime("%Y-%m"),
).order_by('-request_date')
payout_map = {payout.instructor: payout for payout in created_payouts}
```

After `bulk_create`, the function re-queries payouts by filters (status, processed_by, period). If another admin runs the same operation concurrently, this query may return payouts from both operations, causing incorrect mapping.

**Fix:** Use `bulk_create(..., ignore_conflicts=False)` and return the created objects directly (Django 4.0+: `bulk_create` with `update_conflicts` returns IDs), or use `id__in` after creation.

---

## INFO Issues

### 25. `learning_progress/services.py` — Duplicate logic in two functions

**Severity:** INFO  
**File:** `course/learning_progress/services.py`  

`update_learning_progress` (lines 14-52) and `update_lesson_progress` (lines 54-96) contain nearly identical logic for creating/updating learning progress. The only difference is that `update_lesson_progress` includes `enrollment` in defaults. The duplication increases maintenance burden and led to the missing-enrollment bug in `update_learning_progress`.

**Fix:** Consolidate into a single function.

---

### 26. Inconsistent return formats across services

**Severity:** INFO  
**Files:** Multiple  

Services return inconsistent types:
- `courses/services.py` → `create_course` returns `serializer.data` (dict), but `get_all_courses` returns queryset
- `instructors/services.py` → `create_instructor` returns model instance, `get_instructor_by_id` returns serializer.data (dict)
- `categories/services.py` → `create_category` returns model instance, `get_category_by_id` returns serializer.data
- `enrollments/services.py` → `create_enrollment` returns serializer.data, `get_enrollment_by_user` returns queryset
- `supports/services.py` → `create_support` returns model instance, `get_support_by_id` returns dict
- `reviews/services.py` → `create_review` returns model instance, `get_review_by_id` returns dict

Views typically need to serialize whatever comes back, and when some functions return model instances and some return dicts, the views must handle both cases differently. This leads to bugs when a view assumes one format but gets the other.

**Fix:** Pick a consistent convention — either always return model instances/querysets (let views serialize) or always return serializer.data (dicts). The queryset approach is generally preferred for DRF compatibility.

---

### 27. `users/services.py` Line 24 — Typo in function name

**Severity:** INFO  
**File:** `course/users/services.py`  
**Line:** 24  

```python
def update_user_by_selfself(user_id, data):
```

`selfself` → should be `self`. Minor but confusing.

---

### 28. `users/services.py` Line 32 — Hashing raw `password_hash` field

**Severity:** WARNING  
**File:** `course/users/services.py`  
**Lines:** 30-31  

```python
if 'password_hash' in data:
    data['password_hash'] = make_password(data['password_hash'])
```

If `data['password_hash']` already contains a hashed password (e.g., from an API client who misunderstands the field name), this double-hashes it. The field name implies it's already a hash. Should the field accept a plain password? The naming is misleading. This could cause users to have un-usable passwords.

---

### 29. `admins/dashboard_services.py` Lines 50-51 — Non-existent Support status `'pending'`

**Severity:** INFO  
**File:** `course/admins/dashboard_services.py`  
**Lines:** ~50-51  

```python
pending_support_tickets = Support.objects.filter(
    is_deleted=False, status__in=['open', 'pending']
).count()
```

Support model's `STATUS_CHOICES` are `'open'`, `'in_progress'`, `'resolved'`, `'closed'`. There is no `'pending'` status. The `'pending'` filter matches nothing — only `'open'` tickets are counted. May want `'in_progress'` as well.

---

### 30. `admins/dashboard_services.py` Lines 87-120 — Approximate month arithmetic

**Severity:** INFO  
**File:** `course/admins/dashboard_services.py`  
**Lines:** ~87-120  

```python
month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1, ...)
```

Uses `timedelta(days=i * 30)` to go back N months. This is inaccurate for months with 28, 29, or 31 days and can produce wrong month labels or duplicate months. Same pattern in `instructors/dashboard_services.py`.

**Fix:** Use `dateutil.relativedelta` or subtract months manually:
```python
from dateutil.relativedelta import relativedelta
month_start = (now.replace(day=1) - relativedelta(months=i))
```

---

### 31. `blog_posts/services.py` — Unused import `datetime`

**Severity:** INFO  
**File:** `course/blog_posts/services.py`  
**Line:** 2  

```python
from datetime import datetime
```

`datetime` is imported but never used anywhere in the file.

---

### 32. `quiz_questions/services.py` Line 29 — Debug `print()` left in production code

**Severity:** INFO  
**File:** `course/quiz_questions/services.py`  
**Line:** 29  

```python
print("Quiz question created with ID:")
```

Debug print statement left in production code.

---

### 33. `admins/services.py` — Inconsistent `log_activity` call signatures

**Severity:** WARNING  
**File:** `course/admins/services.py` vs other services  

In `admins/services.py`, `log_activity` is called with `request=request`:
```python
log_activity(request=request, action="CREATE", ...)
```

But in `courses/services.py`, `users/services.py`, and others, it's called with `user_id=...`:
```python
log_activity(user_id=course.instructor.user.id, action="CREATE", ...)
```

The `log_activity` function signature supports both, but mixing styles is error-prone. Notably, when `request` is `None` (e.g., called from a cron job), the admin service calls pass `request=None` which means no user is logged.

---

## Summary Table

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | **CRITICAL** | quiz_results/services.py:30 | `question.question_id` — field doesn't exist |
| 2 | **CRITICAL** | quiz_results/services.py:332 | `timezone.timedelta` — AttributeError |
| 3 | **CRITICAL** | instructor_earnings/services.py:148 | `timezone.timedelta` — AttributeError |
| 4 | **CRITICAL** | instructor_earnings/services.py:115-127 | Wrong field names in ORM query + get() |
| 5 | **CRITICAL** | admins/dashboard_services.py:133-138 | Wrong related_name `reviews` (should be `reviews_course`) |
| 6 | **CRITICAL** | instructors/dashboard_services.py:77 | Non-existent QnA status `'unanswered'` |
| 7 | **CRITICAL** | subscription_plans/services.py:~257 | `payment.status` should be `payment.payment_status` |
| 8 | **CRITICAL** | learning_progress/services.py:153-158 | Dot-access on dict object (AttributeError) |
| 9 | **CRITICAL** | learning_progress/services.py:16-32 | Missing required `enrollment` FK (IntegrityError) |
| 10 | **CRITICAL** | reviews/services.py:26-29 | Counter incremented before save, no atomicity |
| 11 | WARNING | enrollments/services.py:14-26 | Race condition on `total_students` |
| 12 | WARNING | enrollments/services.py:11 | `datetime.now()` instead of `timezone.now()` |
| 13 | WARNING | reviews/services.py:65 | Race condition on `likes` counter |
| 14 | WARNING | instructors/services.py:36-48 | Non-atomic user_type update |
| 15 | WARNING | learning_progress/services.py:67-72 | Enrollment check before null course check |
| 16 | WARNING | instructors/dashboard_services.py:81-106 | N+1 query in per-course loop (6 queries × N courses) |
| 17 | WARNING | learning_progress/services.py:217-225 | N+1 query in learning streak loop |
| 18 | WARNING | notifications/services.py:77-103 | N+1 in bulk notification creation |
| 19 | WARNING | admins/services.py:4-33 | Double try/except swallows structured errors |
| 20 | WARNING | blog_posts/services.py:23-24 | Re-wrapping ValidationError loses structure |
| 21 | WARNING | carts/services.py:27-29 | Dead `DoesNotExist` except on `.filter()` |
| 22 | WARNING | users/services.py:99 | Unguarded `data['password']` KeyError |
| 23 | WARNING | instructor_payouts/services.py:1-18 | All imports duplicated |
| 24 | WARNING | instructor_payouts/services.py:56-75 | Race condition in payout mapping |
| 25 | INFO | learning_progress/services.py | Duplicate logic in two functions |
| 26 | INFO | Multiple files | Inconsistent return formats |
| 27 | INFO | users/services.py:24 | Typo: `update_user_by_selfself` |
| 28 | WARNING | users/services.py:30-31 | Potentially double-hashing `password_hash` |
| 29 | INFO | admins/dashboard_services.py:50 | Non-existent Support status `'pending'` |
| 30 | INFO | admins/dashboard_services.py:87-120 | Approximate month arithmetic `i*30` |
| 31 | INFO | blog_posts/services.py:2 | Unused `datetime` import |
| 32 | INFO | quiz_questions/services.py:29 | Debug `print()` in production |
| 33 | WARNING | admins/services.py | Inconsistent `log_activity` call style |

**Totals:** 10 CRITICAL, 15 WARNING, 8 INFO
