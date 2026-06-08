"""Seed a near-complete demo course so a certificate can be earned by finishing
ONE remaining lesson during a live demo.

Run:  python manage.py shell < seed_demo_cert.py

It is idempotent: re-running rebuilds the same demo course from scratch and
leaves the student with 2/3 lessons done (one lesson left to complete).
"""
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from users.models import User
from instructors.models import Instructor
from categories.models import Category
from courses.models import Course
from coursemodules.models import CourseModule
from lessons.models import Lesson
from enrollments.models import Enrollment
from learning_progress.models import LearningProgress
from certificates.models import Certificate

DEMO_TITLE = "Demo Chứng Chỉ - Hoàn thành nhanh"
STUDENT_USERNAME = "student02"
# Real inbox so the certificate email is actually received during the demo.
STUDENT_EMAIL = "ingamecreateltem@gmail.com"

student = User.objects.get(username=STUDENT_USERNAME)
if student.email != STUDENT_EMAIL:
    student.email = STUDENT_EMAIL
    student.save(update_fields=["email"])
instructor = Instructor.objects.filter(is_deleted=False).select_related('user').first()
category = Category.objects.first()

# --- wipe any previous run of this demo course (hard delete the small graph) ---
old = Course.objects.filter(title=DEMO_TITLE)
for c in old:
    Certificate.objects.filter(course=c).delete()
    LearningProgress.objects.filter(course=c).delete()
    Enrollment.objects.filter(course=c).delete()
    Lesson.objects.filter(coursemodule__course=c).delete()
    CourseModule.objects.filter(course=c).delete()
    c.delete()

with transaction.atomic():
    course = Course.objects.create(
        title=DEMO_TITLE,
        shortdescription="Khóa học demo để hoàn thành nhanh và nhận chứng chỉ.",
        description="Chỉ còn 1 bài học cuối. Hoàn thành nó để nhận chứng chỉ.",
        instructor=instructor,
        category=category,
        thumbnail="/static/img/demo.jpg",
        price=Decimal("0.00"),
        level=Course.Level.BEGINNER,
        language="Tiếng Việt",
        duration=30,
        total_lessons=3,
        total_modules=1,
        status=Course.Status.PUBLISHED,
        is_public=True,
        certificate=True,            # <-- course offers a certificate
        published_date=timezone.now(),
    )

    module = CourseModule.objects.create(
        course=course, title="Chương 1", description="Nội dung demo",
        order_number=1, duration=30, status='Published',
    )

    lessons = []
    for i in range(1, 4):
        lessons.append(Lesson.objects.create(
            coursemodule=module,
            title=f"Bài {i}",
            description=f"Bài học số {i}",
            content_type=Lesson.ContentType.TEXT,
            content="Nội dung bài học demo.",
            duration=10, order=i, is_free=True,
            status=Lesson.Status.PUBLISHED,
        ))

    now = timezone.now()
    enrollment = Enrollment.objects.create(
        user=student, course=course, source=Enrollment.Source.GRANTED,
        enrollment_date=now, status=Enrollment.Status.Active,
        progress=Decimal("66.67"), last_access_date=now,
    )

    # Complete the first 2 lessons; leave the 3rd for the live demo.
    for lesson in lessons[:2]:
        LearningProgress.objects.create(
            user=student, enrollment=enrollment, course=course, lesson=lesson,
            progress_percentage=Decimal("100.00"),
            status=LearningProgress.StatusChoices.COMPLETED,
            is_completed=True, completion_date=now, time_spent=600,
        )

print("=== SEED DONE ===")
print(f"course_id     = {course.id}")
print(f"module_id     = {module.id}")
print(f"lesson_ids    = {[l.id for l in lessons]}  (complete lesson {lessons[2].id} to finish)")
print(f"enrollment_id = {enrollment.id}")
print(f"student       = {STUDENT_EMAIL} / password123")
print(f"completed     = 2/3 lessons  (1 lesson left)")
