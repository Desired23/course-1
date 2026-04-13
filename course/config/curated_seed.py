"""Deterministic curated seed for reseed endpoint profiles."""

from __future__ import annotations

import random
import json
import uuid
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from activity_logs.models import ActivityLog
from admins.models import Admin
from applications.models import Application, ApplicationResponse
from blog_comments.models import BlogComment
from blog_posts.models import BlogPost
from carts.models import Cart
from categories.models import Category
from certificates.models import Certificate
from coursemodules.models import CourseModule
from courses.models import Course
from enrollments.models import Enrollment
from forum_comments.models import ForumComment
from forum_topics.models import ForumTopic
from forums.models import Forum
from instructor_earnings.models import InstructorEarning
from instructor_levels.models import InstructorLevel
from instructor_payouts.models import InstructorPayout
from instructors.models import Instructor
from learning_progress.models import LearningProgress
from lesson_attachments.models import LessonAttachment
from lesson_comments.models import LessonComment
from lessons.models import Lesson
from notifications.models import Notification
from payment_details.models import Payment_Details
from payment_methods.models import InstructorPayoutMethod, UserPaymentMethod
from payments.models import Payment
from promotions.models import Promotion
from qna_answers.models import QnAAnswer
from qnas.models import QnA
from quiz_questions.models import QuizQuestion, QuizTestCase
from quiz_results.models import QuizResult
from registration_forms.models import FormQuestion, RegistrationForm
from reviews.models import Review
from subscription_plans.models import (
    CourseSubscriptionConsent,
    PlanCourse,
    SubscriptionPlan,
    SubscriptionUsage,
    UserSubscription,
)
from support_replies.models import SupportReply
from supports.models import Support
from systems_settings.models import SystemsSetting
from users.models import User
from wishlists.models import Wishlist


AVATAR_URLS = [
    "https://img-c.udemycdn.com/user/200_H/31926668_94e7_6.jpg",
    "https://img-c.udemycdn.com/user/200_H/38516954_b11c_3.jpg",
    "https://img-c.udemycdn.com/user/200_H/13952972_e853.jpg",
    "https://img-c.udemycdn.com/user/200_H/9685726_67e7_4.jpg",
    "https://img-c.udemycdn.com/user/200_H/199907082_3148_2.jpg",
    "https://img-c.udemycdn.com/user/200_H/35906398_7c0c_3.jpg",
    "https://img-c.udemycdn.com/user/200_H/51770164_07e5_2.jpg",
    "https://img-c.udemycdn.com/user/200_H/6014906_bceb_5.jpg",
]

THUMB_URLS = [
    "https://img-c.udemycdn.com/course/750x422/851712_fc61_6.jpg",
    "https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg",
    "https://img-c.udemycdn.com/course/750x422/567828_67d0.jpg",
    "https://img-c.udemycdn.com/course/750x422/625204_436a_3.jpg",
    "https://img-c.udemycdn.com/course/750x422/903744_8eb2.jpg",
    "https://img-c.udemycdn.com/course/750x422/950390_270f_3.jpg",
    "https://img-c.udemycdn.com/course/750x422/947098_02ec_2.jpg",
    "https://img-c.udemycdn.com/course/750x422/3490000_be35_2.jpg",
]

VIDEO_URLS = [
    "https://picsum.photos/seed/lesson-video-1/1280/720",
    "https://picsum.photos/seed/lesson-video-2/1280/720",
    "https://picsum.photos/seed/lesson-video-3/1280/720",
    "https://picsum.photos/seed/lesson-video-4/1280/720",
]

DEFAULT_HOMEPAGE_COMPONENTS = [
    "HeroSection",
    "TrustedCompanies",
    "FeaturesSection",
    "Categories",
    "FeaturedCourses",
    "LearningGoals",
    "TrendingCourses",
    "PopularSkills",
    "TestimonialsSection",
    "StatsSection",
    "InstructorPromo",
    "NewsletterSection",
]


@dataclass
class SeedContext:
    now: Any
    rng: random.Random
    report: dict[str, int]


class SeedError(Exception):
    """Raised when curated seed profile is not supported."""


SUPPORTED_CURATED_PROFILES = ("demo-small", "demo-medium", "demo-large")

PROFILE_SETTINGS: dict[str, dict[str, int]] = {
    "demo-small": {
        "students_count": 10,
        "total_courses": 8,
        "published_courses": 6,
        "quiz_lesson_limit": 12,
        "promo_course_limit": 4,
        "plan_course_limit": 5,
        "purchase_student_count": 6,
        "subscription_student_count": 2,
        "review_limit": 12,
        "blog_post_count": 3,
        "blog_comments_per_post": 1,
        "forum_course_limit": 2,
        "qna_course_limit": 3,
        "support_count": 3,
        "lesson_comment_limit": 4,
        "wishlist_per_student": 1,
        "activity_log_count": 3,
        "application_count": 2,
    },
    "demo-medium": {
        "students_count": 18,
        "total_courses": 12,
        "published_courses": 10,
        "quiz_lesson_limit": 24,
        "promo_course_limit": 6,
        "plan_course_limit": 8,
        "purchase_student_count": 10,
        "subscription_student_count": 4,
        "review_limit": 24,
        "blog_post_count": 5,
        "blog_comments_per_post": 1,
        "forum_course_limit": 4,
        "qna_course_limit": 6,
        "support_count": 5,
        "lesson_comment_limit": 8,
        "wishlist_per_student": 1,
        "activity_log_count": 5,
        "application_count": 4,
    },
    "demo-large": {
        "students_count": 30,
        "total_courses": 16,
        "published_courses": 14,
        "quiz_lesson_limit": 40,
        "promo_course_limit": 10,
        "plan_course_limit": 12,
        "purchase_student_count": 20,
        "subscription_student_count": 8,
        "review_limit": 40,
        "blog_post_count": 8,
        "blog_comments_per_post": 2,
        "forum_course_limit": 6,
        "qna_course_limit": 10,
        "support_count": 10,
        "lesson_comment_limit": 20,
        "wishlist_per_student": 2,
        "activity_log_count": 25,
        "application_count": 6,
    },
}


def run_curated_seed(profile: str, random_seed: int) -> dict[str, Any]:
    normalized_profile = (profile or "demo-medium").strip().lower()
    if normalized_profile not in PROFILE_SETTINGS:
        raise SeedError(f"Unsupported curated seed profile: {profile}")
    profile_settings = PROFILE_SETTINGS[normalized_profile]

    rng = random.Random(int(random_seed))
    ctx = SeedContext(now=timezone.now(), rng=rng, report={})

    with transaction.atomic():
        users_data = _seed_users(ctx, profile_settings)
        content_data = _seed_learning_content(ctx, users_data, profile_settings)
        commerce_data = _seed_commerce(ctx, users_data, content_data, profile_settings)
        _seed_learning_outcomes(ctx, users_data, content_data, commerce_data, profile_settings)
        _seed_social_and_support(ctx, users_data, content_data, profile_settings)
        _seed_platform_metadata(ctx, users_data, profile_settings)

    total_records = sum(ctx.report.values())
    return {
        "profile": normalized_profile,
        "random_seed": int(random_seed),
        "created_counts": ctx.report,
        "total_records": total_records,
    }


def _count(ctx: SeedContext, key: str, amount: int) -> None:
    ctx.report[key] = ctx.report.get(key, 0) + amount


def _seed_users(ctx: SeedContext, profile_settings: dict[str, int]) -> dict[str, Any]:
    password_hash = make_password("password123")

    admin_user = User.objects.create(
        username="admin",
        email="admin@example.com",
        password_hash=password_hash,
        full_name="Platform Admin",
        user_type=User.UserTypeChoices.ADMIN,
        status=User.StatusChoices.ACTIVE,
        avatar=AVATAR_URLS[0],
        phone="0900000001",
    )
    admin = Admin.objects.create(user=admin_user, department="Operations", role="super_admin")

    level_specs = [
        ("Bronze", 0, Decimal("0.00"), Decimal("30.00")),
        ("Silver", 200, Decimal("20000000.00"), Decimal("28.00")),
        ("Gold", 500, Decimal("50000000.00"), Decimal("25.00")),
        ("Platinum", 900, Decimal("90000000.00"), Decimal("22.00")),
    ]
    levels = []
    for name, min_minutes, min_revenue, commission in level_specs:
        levels.append(
            InstructorLevel.objects.create(
                name=name,
                description=f"{name} level",
                min_plan_minutes=min_minutes,
                min_revenue=min_revenue,
                commission_rate=commission,
                plan_commission_rate=commission,
            )
        )

    instructor_specs = [
        ("nguyenvana", "Nguyen Van A", "Web Development"),
        ("tranthib", "Tran Thi B", "Data Science"),
        ("levanc", "Le Van C", "DevOps"),
        ("phamthid", "Pham Thi D", "UI/UX"),
        ("hoangvane", "Hoang Van E", "Mobile"),
        ("vothif", "Vo Thi F", "Backend"),
    ]
    instructors = []
    for idx, (username, full_name, specialization) in enumerate(instructor_specs):
        user = User.objects.create(
            username=username,
            email=f"{username}@example.com",
            password_hash=password_hash,
            full_name=full_name,
            user_type=User.UserTypeChoices.INSTRUCTOR,
            status=User.StatusChoices.ACTIVE,
            avatar=AVATAR_URLS[(idx + 1) % len(AVATAR_URLS)],
            phone=f"09111{idx:05d}",
        )
        instructors.append(
            Instructor.objects.create(
                user=user,
                specialization=specialization,
                bio=f"{full_name} has strong practical experience in {specialization}.",
                qualification="Master in Computer Science",
                experience=5 + idx,
                rating=Decimal("4.50") + Decimal(str((idx % 3) * 0.1)),
                total_students=200 + idx * 100,
                total_courses=0,
                level=levels[min(idx, len(levels) - 1)],
                social_links={"linkedin": f"https://linkedin.com/in/{username}"},
            )
        )

    students = []
    for idx in range(1, profile_settings["students_count"] + 1):
        username = f"student{idx:02d}"
        students.append(
            User.objects.create(
                username=username,
                email=f"{username}@example.com",
                password_hash=password_hash,
                full_name=f"Student {idx:02d}",
                user_type=User.UserTypeChoices.STUDENT,
                status=User.StatusChoices.ACTIVE,
                avatar=AVATAR_URLS[(idx + 2) % len(AVATAR_URLS)],
                phone=f"09222{idx:05d}",
            )
        )

    _count(ctx, "users", 1 + len(instructor_specs) + len(students))
    _count(ctx, "admins", 1)
    _count(ctx, "instructor_levels", len(levels))
    _count(ctx, "instructors", len(instructors))

    return {
        "admin_user": admin_user,
        "admin": admin,
        "instructors": instructors,
        "students": students,
        "all_users": [admin_user] + [ins.user for ins in instructors] + students,
    }


def _seed_learning_content(
    ctx: SeedContext,
    users_data: dict[str, Any],
    profile_settings: dict[str, int],
) -> dict[str, Any]:
    taxonomy = {
        "Programming": ["Python", "JavaScript"],
        "Data": ["Machine Learning", "Data Analysis"],
        "Design": ["UI UX", "Graphic Design"],
        "DevOps": ["Cloud", "Automation"],
    }

    parents: dict[str, Category] = {}
    subcategories: list[Category] = []
    for parent_name, children in taxonomy.items():
        parent = Category.objects.create(name=parent_name, description=f"{parent_name} tracks", status="active")
        parents[parent_name] = parent
        for child in children:
            subcategories.append(
                Category.objects.create(
                    name=child,
                    parent_category=parent,
                    status="active",
                    description=f"{child} sub category",
                )
            )

    course_specs = [
        ("Python Foundations", "Programming", "Python", Decimal("499000.00"), True),
        ("Advanced Python APIs", "Programming", "Python", Decimal("899000.00"), True),
        ("JavaScript Core", "Programming", "JavaScript", Decimal("549000.00"), False),
        ("React for Production", "Programming", "JavaScript", Decimal("999000.00"), True),
        ("ML Essentials", "Data", "Machine Learning", Decimal("1099000.00"), True),
        ("Data Analysis with Pandas", "Data", "Data Analysis", Decimal("699000.00"), False),
        ("UX Thinking", "Design", "UI UX", Decimal("599000.00"), False),
        ("Design Systems", "Design", "Graphic Design", Decimal("749000.00"), False),
        ("Cloud Infrastructure", "DevOps", "Cloud", Decimal("1199000.00"), True),
        ("CI CD in Practice", "DevOps", "Automation", Decimal("899000.00"), True),
        ("Draft Backend Architecture", "Programming", "Python", Decimal("0.00"), False),
        ("Draft Product Design", "Design", "UI UX", Decimal("0.00"), False),
        ("Node.js Backend Engineering", "Programming", "JavaScript", Decimal("949000.00"), True),
        ("Data Visualization Storytelling", "Data", "Data Analysis", Decimal("629000.00"), False),
        ("Interaction Design Patterns", "Design", "UI UX", Decimal("729000.00"), True),
        ("Kubernetes for Teams", "DevOps", "Cloud", Decimal("1299000.00"), True),
        ("Prompt Engineering Basics", "Programming", "Python", Decimal("459000.00"), False),
        ("MLOps Delivery Workflow", "Data", "Machine Learning", Decimal("1199000.00"), True),
        ("Automation with GitHub Actions", "DevOps", "Automation", Decimal("799000.00"), True),
        ("Design QA Handbook", "Design", "Graphic Design", Decimal("0.00"), False),
    ]

    selected_course_specs = course_specs[: profile_settings["total_courses"]]
    by_sub_name = {cat.name: cat for cat in subcategories}
    instructors = users_data["instructors"]
    courses: list[Course] = []
    for idx, (title, parent_name, sub_name, price, cert) in enumerate(selected_course_specs):
        status = Course.Status.PUBLISHED if idx < profile_settings["published_courses"] else Course.Status.DRAFT
        published_date = ctx.now - timedelta(days=(idx + 5)) if status == Course.Status.PUBLISHED else None
        course = Course.objects.create(
            title=title,
            shortdescription=f"Learn {title} with practical modules.",
            description=f"{title} is a curated course for realistic learning outcomes.",
            instructor=instructors[idx % len(instructors)],
            category=parents[parent_name],
            subcategory=by_sub_name[sub_name],
            thumbnail=THUMB_URLS[idx % len(THUMB_URLS)],
            price=price,
            discount_price=(price * Decimal("0.85")).quantize(Decimal("0.01")) if price > 0 else None,
            discount_start_date=ctx.now - timedelta(days=2) if price > 0 and idx % 2 == 0 else None,
            discount_end_date=ctx.now + timedelta(days=14) if price > 0 and idx % 2 == 0 else None,
            level=[Course.Level.BEGINNER, Course.Level.INTERMEDIATE, Course.Level.ADVANCED][idx % 3],
            language="Vietnamese",
            duration=420 + (idx * 20),
            total_lessons=8,
            total_modules=2,
            requirements="Laptop and internet",
            learning_objectives=["Build practical skills", "Complete guided projects"],
            target_audience=["Students", "Junior engineers"],
            tags=[parent_name.lower(), sub_name.lower()],
            status=status,
            published_date=published_date,
            is_featured=idx < 6,
            rating=Decimal("4.20") + Decimal(str((idx % 4) * 0.1)),
            total_reviews=0,
            total_students=0,
            certificate=cert,
        )
        courses.append(course)

    modules: list[CourseModule] = []
    lessons: list[Lesson] = []
    quiz_lessons: list[Lesson] = []

    for course_idx, course in enumerate(courses):
        for module_order in range(1, 3):
            module = CourseModule.objects.create(
                course=course,
                title=f"Module {module_order}: {course.title}",
                description=f"Structured module {module_order}",
                order_number=module_order,
                duration=90,
                status="Published" if course.status == Course.Status.PUBLISHED else "Draft",
            )
            modules.append(module)

            for lesson_order in range(1, 5):
                if lesson_order == 4:
                    content_type = Lesson.ContentType.QUIZ
                elif lesson_order == 3:
                    content_type = Lesson.ContentType.TEXT
                else:
                    content_type = Lesson.ContentType.VIDEO

                lesson = Lesson.objects.create(
                    coursemodule=module,
                    title=f"Lesson {lesson_order} - {course.title}",
                    description="Concise lesson description",
                    content_type=content_type,
                    content="Lesson content body" if content_type == Lesson.ContentType.TEXT else None,
                    video_url=VIDEO_URLS[(course_idx + lesson_order) % len(VIDEO_URLS)] if content_type == Lesson.ContentType.VIDEO else None,
                    duration=18 + lesson_order,
                    is_free=(module_order == 1 and lesson_order <= 2),
                    order=lesson_order,
                    status=Lesson.Status.PUBLISHED if course.status == Course.Status.PUBLISHED else Lesson.Status.DRAFT,
                )
                lessons.append(lesson)
                if content_type == Lesson.ContentType.QUIZ and course.status == Course.Status.PUBLISHED:
                    quiz_lessons.append(lesson)

                if content_type != Lesson.ContentType.QUIZ and lesson_order in (1, 2):
                    LessonAttachment.objects.create(
                        lesson=lesson,
                        title=f"Resource for {lesson.title}",
                        file_path=f"/uploads/resources/{course.id}_{module_order}_{lesson_order}.pdf",
                        file_type="application/pdf",
                        file_size=150000,
                    )

    quiz_questions = []
    quiz_test_cases = 0
    for idx, lesson in enumerate(quiz_lessons[: profile_settings["quiz_lesson_limit"]]):
        for q_order in range(1, 3):
            if (idx + q_order) % 3 == 0:
                qtype = QuizQuestion.QuestionType.CODE
                options = None
                answer = "def solve(a, b):\n    return a + b"
            elif (idx + q_order) % 2 == 0:
                qtype = QuizQuestion.QuestionType.TRUE_FALSE
                options = [{"text": "True"}, {"text": "False"}]
                answer = "True"
            else:
                qtype = QuizQuestion.QuestionType.MULTIPLE_CHOICE
                options = [
                    {"text": "Option A", "is_correct": True},
                    {"text": "Option B", "is_correct": False},
                    {"text": "Option C", "is_correct": False},
                ]
                answer = "Option A"

            question = QuizQuestion.objects.create(
                lesson=lesson,
                difficulty=QuizQuestion.DifficultyLevel.MEDIUM,
                question_text=f"{lesson.title} question {q_order}",
                question_type=qtype,
                options=options,
                correct_answer=answer,
                points=5,
                explanation="Deterministic explanation",
                order_number=q_order,
                time_limit=120 if qtype == QuizQuestion.QuestionType.CODE else None,
                memory_limit=65536 if qtype == QuizQuestion.QuestionType.CODE else None,
                allowed_languages=[71, 63] if qtype == QuizQuestion.QuestionType.CODE else None,
            )
            quiz_questions.append(question)

            if qtype == QuizQuestion.QuestionType.CODE:
                for tc_order in range(1, 3):
                    QuizTestCase.objects.create(
                        question=question,
                        input_data=f"{tc_order},{tc_order + 1}",
                        expected_output=str(tc_order + tc_order + 1),
                        is_hidden=(tc_order == 2),
                        points=2,
                        order_number=tc_order,
                    )
                    quiz_test_cases += 1

    for ins in instructors:
        ins.total_courses = Course.objects.filter(instructor=ins, is_deleted=False).count()
        ins.save(update_fields=["total_courses"])

    _count(ctx, "categories", len(parents) + len(subcategories))
    _count(ctx, "courses", len(courses))
    _count(ctx, "course_modules", len(modules))
    _count(ctx, "lessons", len(lessons))
    _count(ctx, "lesson_attachments", LessonAttachment.objects.count())
    _count(ctx, "quiz_questions", len(quiz_questions))
    _count(ctx, "quiz_test_cases", quiz_test_cases)

    return {
        "courses": courses,
        "published_courses": [c for c in courses if c.status == Course.Status.PUBLISHED],
        "quiz_lessons": quiz_lessons,
        "lessons_by_course": _map_lessons_by_course(lessons),
    }


def _map_lessons_by_course(lessons: list[Lesson]) -> dict[int, list[Lesson]]:
    by_course: dict[int, list[Lesson]] = {}
    for lesson in lessons:
        course_id = lesson.coursemodule.course_id
        by_course.setdefault(course_id, []).append(lesson)

    for course_id, course_lessons in by_course.items():
        by_course[course_id] = sorted(
            course_lessons,
            key=lambda item: (item.coursemodule.order_number, item.order, item.id),
        )
    return by_course


def _seed_commerce(
    ctx: SeedContext,
    users_data: dict[str, Any],
    content_data: dict[str, Any],
    profile_settings: dict[str, int],
) -> dict[str, Any]:
    admin = users_data["admin"]
    students = users_data["students"]
    published_courses = content_data["published_courses"]

    promo = Promotion.objects.create(
        code="WELCOME20",
        description="Welcome discount",
        discount_type=Promotion.DiscountTypeChoices.PERCENTAGE,
        discount_value=Decimal("20.00"),
        start_date=ctx.now - timedelta(days=2),
        end_date=ctx.now + timedelta(days=25),
        usage_limit=200,
        used_count=0,
        min_purchase=Decimal("0.00"),
        max_discount=Decimal("250000.00"),
        admin=admin,
        status=Promotion.StatusChoices.ACTIVE,
    )
    promo.applicable_courses.set(published_courses[: profile_settings["promo_course_limit"]])

    plans = [
        SubscriptionPlan.objects.create(
            name="Basic Monthly",
            description="Access selected courses",
            price=Decimal("199000.00"),
            duration_type=SubscriptionPlan.DurationType.MONTHLY,
            duration_days=30,
            status=SubscriptionPlan.Status.ACTIVE,
            is_featured=False,
            features=["Core courses", "Community support"],
            not_included=["1:1 mentoring"],
            badge_text=None,
            created_by=users_data["admin_user"],
        ),
        SubscriptionPlan.objects.create(
            name="Pro Monthly",
            description="Access all standard courses",
            price=Decimal("299000.00"),
            duration_type=SubscriptionPlan.DurationType.MONTHLY,
            duration_days=30,
            status=SubscriptionPlan.Status.ACTIVE,
            is_featured=True,
            features=["All courses", "Priority support", "Certificates"],
            not_included=[],
            badge_text="Most Popular",
            created_by=users_data["admin_user"],
        ),
    ]

    for plan in plans:
        for course in published_courses[: profile_settings["plan_course_limit"]]:
            PlanCourse.objects.create(plan=plan, course=course, status=PlanCourse.Status.ACTIVE, added_by=users_data["admin_user"])

    enrollments: list[Enrollment] = []
    payments: list[Payment] = []
    user_subscriptions: list[UserSubscription] = []
    payment_details_count = 0

    purchase_count = profile_settings["purchase_student_count"]
    subscription_count = profile_settings["subscription_student_count"]

    for idx, student in enumerate(students[:purchase_count]):
        chosen_courses = published_courses[(idx % 6):(idx % 6) + 2]
        if len(chosen_courses) < 2:
            chosen_courses = published_courses[:2]

        payment = Payment.objects.create(
            user=student,
            payment_type=Payment.PaymentType.COURSE_PURCHASE,
            amount=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            total_amount=Decimal("0.00"),
            transaction_id=f"TXN_{uuid.uuid4().hex[:16].upper()}",
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.VNPAY if idx % 2 == 0 else Payment.PaymentMethod.MOMO,
            promotion=promo if idx % 3 == 0 else None,
        )

        gross = Decimal("0.00")
        discount_total = Decimal("0.00")

        for course in chosen_courses:
            price = course.discount_price or course.price
            discount = (price * Decimal("0.20")).quantize(Decimal("0.01")) if idx % 3 == 0 else Decimal("0.00")
            final_price = max(Decimal("0.00"), price - discount)
            Payment_Details.objects.create(
                payment=payment,
                course=course,
                price=price,
                discount=discount,
                final_price=final_price,
                promotion=promo if discount > 0 else None,
            )
            payment_details_count += 1

            progress_val = Decimal("100.00") if idx % 5 == 0 else Decimal(str(40 + (idx % 4) * 15))
            status = Enrollment.Status.Complete if progress_val >= 100 else Enrollment.Status.Active
            completion_date = ctx.now - timedelta(days=4) if status == Enrollment.Status.Complete else None
            enrollment = Enrollment.objects.create(
                user=student,
                course=course,
                payment=payment,
                source=Enrollment.Source.PURCHASE,
                enrollment_date=ctx.now - timedelta(days=20 - idx),
                progress=progress_val,
                status=status,
                completion_date=completion_date,
                last_access_date=ctx.now - timedelta(days=idx % 7),
            )
            enrollments.append(enrollment)

            InstructorEarning.objects.create(
                instructor=course.instructor,
                course=course,
                payment=payment,
                amount=final_price,
                net_amount=(final_price * Decimal("0.72")).quantize(Decimal("0.01")),
                status=InstructorEarning.StatusChoices.AVAILABLE if idx % 2 == 0 else InstructorEarning.StatusChoices.PENDING,
            )

            gross += price
            discount_total += discount

        payment.amount = gross
        payment.discount_amount = discount_total
        payment.total_amount = gross - discount_total
        payment.save(update_fields=["amount", "discount_amount", "total_amount"])
        payments.append(payment)

    for idx, student in enumerate(students[purchase_count : purchase_count + subscription_count]):
        plan = plans[idx % len(plans)]
        sub_payment = Payment.objects.create(
            user=student,
            payment_type=Payment.PaymentType.SUBSCRIPTION,
            subscription_plan=plan,
            amount=plan.price,
            discount_amount=Decimal("0.00"),
            total_amount=plan.price,
            transaction_id=f"SUB_{uuid.uuid4().hex[:16].upper()}",
            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=Payment.PaymentMethod.MOMO,
        )
        payments.append(sub_payment)

        start_date = ctx.now - timedelta(days=10 + idx)
        user_subscription = UserSubscription.objects.create(
            user=student,
            plan=plan,
            payment=sub_payment,
            status=UserSubscription.Status.ACTIVE,
            start_date=start_date,
            end_date=start_date + timedelta(days=plan.duration_days),
            auto_renew=(idx % 2 == 0),
        )
        user_subscriptions.append(user_subscription)

        plan_courses = list(PlanCourse.objects.filter(plan=plan, status=PlanCourse.Status.ACTIVE)[:2])
        for plan_course in plan_courses:
            enrollment = Enrollment.objects.create(
                user=student,
                course=plan_course.course,
                source=Enrollment.Source.SUBSCRIPTION,
                subscription=user_subscription,
                enrollment_date=start_date,
                progress=Decimal("25.00"),
                status=Enrollment.Status.Active,
                last_access_date=ctx.now - timedelta(days=1),
            )
            enrollments.append(enrollment)
            SubscriptionUsage.objects.create(
                user_subscription=user_subscription,
                user=student,
                course=plan_course.course,
                enrollment=enrollment,
                usage_type=SubscriptionUsage.UsageType.COURSE_ACCESS,
                access_count=3 + idx,
                consumed_minutes=90 + idx * 20,
            )

    for idx, course in enumerate(published_courses[:8]):
        CourseSubscriptionConsent.objects.create(
            instructor=course.instructor,
            course=course,
            consent_status=(
                CourseSubscriptionConsent.ConsentStatus.OPTED_IN if idx % 3 != 0 else CourseSubscriptionConsent.ConsentStatus.OPTED_OUT
            ),
            note="Curated consent state",
        )

    payout = InstructorPayout.objects.create(
        instructor=users_data["instructors"][0],
        amount=Decimal("2500000.00"),
        fee=Decimal("50000.00"),
        net_amount=Decimal("2450000.00"),
        payment_method="bank_transfer",
        status=InstructorPayout.PayoutStatusChoices.PROCESSED,
        period=ctx.now.strftime("%Y-%m"),
        processed_by=admin,
        processed_date=ctx.now - timedelta(days=1),
        notes="Curated payout",
    )

    first_available = InstructorEarning.objects.filter(status=InstructorEarning.StatusChoices.AVAILABLE).order_by("id")[:2]
    for earning in first_available:
        earning.status = InstructorEarning.StatusChoices.PAID
        earning.instructor_payout = payout
        earning.save(update_fields=["status", "instructor_payout"])

    for idx, student in enumerate(students):
        UserPaymentMethod.objects.create(
            user=student,
            method_type=UserPaymentMethod.MethodType.VNPAY if idx % 2 == 0 else UserPaymentMethod.MethodType.MOMO,
            is_default=True,
            nickname="Primary",
            masked_account=f"****{1000 + idx}",
            bank_name="VCB",
        )

    for instructor in users_data["instructors"]:
        InstructorPayoutMethod.objects.create(
            instructor=instructor,
            method_type=InstructorPayoutMethod.MethodType.BANK_TRANSFER,
            is_default=True,
            nickname="Primary bank",
            bank_name="VCB",
            account_number=f"00{1000000 + instructor.id}",
            account_name=instructor.user.full_name.upper(),
        )

    _count(ctx, "promotions", 1)
    _count(ctx, "subscription_plans", len(plans))
    _count(ctx, "plan_courses", PlanCourse.objects.count())
    _count(ctx, "payments", len(payments))
    _count(ctx, "payment_details", payment_details_count)
    _count(ctx, "enrollments", len(enrollments))
    _count(ctx, "user_subscriptions", len(user_subscriptions))
    _count(ctx, "subscription_usage", SubscriptionUsage.objects.count())
    _count(ctx, "course_subscription_consents", CourseSubscriptionConsent.objects.count())
    _count(ctx, "instructor_earnings", InstructorEarning.objects.count())
    _count(ctx, "instructor_payouts", 1)
    _count(ctx, "user_payment_methods", UserPaymentMethod.objects.count())
    _count(ctx, "instructor_payout_methods", InstructorPayoutMethod.objects.count())

    return {
        "enrollments": enrollments,
        "payments": payments,
    }


def _seed_learning_outcomes(
    ctx: SeedContext,
    users_data: dict[str, Any],
    content_data: dict[str, Any],
    commerce_data: dict[str, Any],
    profile_settings: dict[str, int],
) -> None:
    lessons_by_course = content_data["lessons_by_course"]
    quiz_lesson_ids = {lesson.id for lesson in content_data["quiz_lessons"]}

    progress_count = 0
    quiz_result_count = 0
    certificate_count = 0

    for enrollment in commerce_data["enrollments"]:
        if not enrollment.course_id:
            continue

        course_lessons = lessons_by_course.get(enrollment.course_id, [])
        if not course_lessons:
            continue

        if enrollment.status == Enrollment.Status.Complete:
            completed_count = min(6, len(course_lessons))
        else:
            completed_count = min(3, len(course_lessons))

        for idx, lesson in enumerate(course_lessons[:6]):
            is_completed = idx < completed_count
            LearningProgress.objects.create(
                user=enrollment.user,
                enrollment=enrollment,
                course=enrollment.course,
                lesson=lesson,
                progress_percentage=Decimal("100.00") if is_completed else Decimal("45.00"),
                status=LearningProgress.StatusChoices.COMPLETED if is_completed else LearningProgress.StatusChoices.IN_PROGRESS,
                start_time=ctx.now - timedelta(days=5, hours=idx),
                completion_date=(ctx.now - timedelta(days=2, hours=idx)) if is_completed else None,
                time_spent=1200 if is_completed else 500,
                is_completed=is_completed,
            )
            progress_count += 1

            if lesson.id in quiz_lesson_ids:
                total_questions = 6
                correct_answers = 5 if is_completed else 2
                start_time = ctx.now - timedelta(days=1, hours=idx)
                submit_time = start_time + timedelta(minutes=14)
                score = Decimal("83.00") if is_completed else Decimal("42.00")
                QuizResult.objects.create(
                    enrollment=enrollment,
                    lesson=lesson,
                    start_time=start_time,
                    submit_time=submit_time,
                    time_taken=840,
                    total_questions=total_questions,
                    correct_answers=correct_answers,
                    total_points=30,
                    score=score,
                    answers={"q1": "A", "q2": "B"},
                    passed=bool(score >= 60),
                    attempt=1,
                )
                quiz_result_count += 1

        if enrollment.status == Enrollment.Status.Complete and enrollment.course.certificate and not Certificate.objects.filter(enrollment=enrollment).exists():
            cert = Certificate.objects.create(
                user=enrollment.user,
                course=enrollment.course,
                enrollment=enrollment,
                certificate_url=f"https://example.com/certificates/{enrollment.id}.pdf",
                student_name=enrollment.user.full_name,
                course_title=enrollment.course.title,
                instructor_name=enrollment.course.instructor.user.full_name if enrollment.course.instructor else None,
                completion_date=enrollment.completion_date or ctx.now,
            )
            enrollment.certificate = cert.certificate_url
            enrollment.certificate_issue_date = cert.issued_at
            enrollment.save(update_fields=["certificate", "certificate_issue_date"])
            certificate_count += 1

    review_count = 0
    for idx, enrollment in enumerate(commerce_data["enrollments"][: profile_settings["review_limit"]]):
        Review.objects.create(
            course=enrollment.course,
            user=enrollment.user,
            rating=4 + (idx % 2),
            comment="Quality content with practical examples.",
            status=Review.StatusChoices.APPROVED,
            likes=idx % 7,
            instructor_response="Thanks for the feedback" if idx % 3 == 0 else None,
            response_at=ctx.now - timedelta(days=1) if idx % 3 == 0 else None,
        )
        review_count += 1

    for course in content_data["published_courses"]:
        approved_reviews = Review.objects.filter(course=course, status=Review.StatusChoices.APPROVED, is_deleted=False)
        course.total_reviews = approved_reviews.count()
        course.total_students = Enrollment.objects.filter(course=course, is_deleted=False).count()
        if course.total_reviews > 0:
            avg_rating = approved_reviews.values_list("rating", flat=True)
            course.rating = Decimal(str(round(sum(avg_rating) / len(avg_rating), 2)))
        course.save(update_fields=["total_reviews", "total_students", "rating"])

    _count(ctx, "learning_progress", progress_count)
    _count(ctx, "quiz_results", quiz_result_count)
    _count(ctx, "certificates", certificate_count)
    _count(ctx, "reviews", review_count)


def _seed_social_and_support(
    ctx: SeedContext,
    users_data: dict[str, Any],
    content_data: dict[str, Any],
    profile_settings: dict[str, int],
) -> None:
    students = users_data["students"]
    instructors = users_data["instructors"]
    courses = content_data["published_courses"]
    all_users = users_data["all_users"]

    blog_posts = []
    for idx in range(profile_settings["blog_post_count"]):
        title = f"Learning Insights #{idx + 1}"
        post = BlogPost.objects.create(
            title=title,
            content=f"Curated article content for {title}.",
            author=instructors[idx % len(instructors)].user,
            status=BlogPost.StatusChoices.PUBLISHED,
            tags=["learning", "tips"],
            category=courses[idx % len(courses)].category,
            slug=f"{slugify(title)}-{idx + 1}",
            summary="Curated summary",
            published_at=ctx.now - timedelta(days=idx + 2),
            views=120 + idx * 15,
            likes=20 + idx,
            is_featured=(idx < 2),
        )
        blog_posts.append(post)

    blog_comment_count = 0
    for idx, post in enumerate(blog_posts):
        for offset in range(profile_settings["blog_comments_per_post"]):
            BlogComment.objects.create(
                blog_post=post,
                content="Thanks for the practical breakdown.",
                user=students[(idx + offset) % len(students)],
                status="active",
                likes=offset,
            )
            blog_comment_count += 1

    forums = []
    topic_count = 0
    forum_comment_count = 0
    for idx, course in enumerate(courses[: profile_settings["forum_course_limit"]]):
        forum = Forum.objects.create(
            course=course,
            title=f"Forum for {course.title}",
            description="Discuss lessons and exercises",
            user=course.instructor.user,
            status="active",
        )
        forums.append(forum)
        for topic_idx in range(2):
            topic = ForumTopic.objects.create(
                forum=forum,
                title=f"Topic {topic_idx + 1} - {course.title}",
                content="How to approach the assignment?",
                user=students[(idx + topic_idx) % len(students)],
                status="active",
                views=20 + topic_idx,
                likes=topic_idx,
            )
            topic_count += 1
            ForumComment.objects.create(
                topic=topic,
                content="Try module notes first.",
                user=course.instructor.user,
                status="active",
            )
            forum_comment_count += 1

    qna_count = 0
    qna_answer_count = 0
    for idx, course in enumerate(courses[: profile_settings["qna_course_limit"]]):
        lesson = Lesson.objects.filter(coursemodule__course=course, is_deleted=False).order_by("coursemodule__order_number", "order").first()
        if not lesson:
            continue
        qna = QnA.objects.create(
            course=course,
            lesson=lesson,
            question="Can you explain this concept with an example?",
            user=students[idx % len(students)],
            status=QnA.StatusChoices.ANSWERED,
            description="Need a more concrete scenario.",
            tags=["clarification"],
            views=15 + idx,
            votes=idx % 4,
        )
        qna_count += 1
        QnAAnswer.objects.create(
            qna=qna,
            answer="Sure, here is a practical walk-through.",
            user=course.instructor.user,
            is_accepted=True,
            likes=2,
        )
        qna_answer_count += 1

    support_count = 0
    support_reply_count = 0
    for idx in range(profile_settings["support_count"]):
        support = Support.objects.create(
            user=students[idx],
            name=students[idx].full_name,
            email=students[idx].email,
            subject=f"Support request {idx + 1}",
            message="Need help with payment confirmation.",
            status=["open", "in_progress", "resolved"][idx % 3],
            priority=["low", "medium", "high"][idx % 3],
            admin=users_data["admin"],
        )
        support_count += 1
        if idx % 2 == 0:
            SupportReply.objects.create(
                support=support,
                user=users_data["admin_user"],
                admin=users_data["admin"],
                message="We have reviewed your request and replied.",
            )
            support_reply_count += 1

    lesson_comment_count = 0
    for lesson in Lesson.objects.filter(status=Lesson.Status.PUBLISHED)[: profile_settings["lesson_comment_limit"]]:
        LessonComment.objects.create(
            user=students[lesson.id % len(students)],
            lesson=lesson,
            content="Great lesson pacing.",
            votes=lesson.id % 5,
        )
        lesson_comment_count += 1

    cart_count = 0
    wishlist_count = 0
    notification_count = 0
    for idx, student in enumerate(students):
        enrolled_course_ids = set(Enrollment.objects.filter(user=student, is_deleted=False).values_list("course_id", flat=True))
        available_courses = [course for course in courses if course.id not in enrolled_course_ids]

        for course in available_courses[:1]:
            Cart.objects.create(user=student, course=course)
            cart_count += 1

        for course in available_courses[1 : 1 + profile_settings["wishlist_per_student"]]:
            Wishlist.objects.create(user=student, course=course)
            wishlist_count += 1

        Notification.objects.create(
            title="Weekly learning reminder",
            sender=users_data["admin_user"],
            receiver=student,
            message="Continue your current course to keep your streak.",
            type=Notification.TypeChoise.COURSE,
        )
        notification_count += 1

    _count(ctx, "blog_posts", len(blog_posts))
    _count(ctx, "blog_comments", blog_comment_count)
    _count(ctx, "forums", len(forums))
    _count(ctx, "forum_topics", topic_count)
    _count(ctx, "forum_comments", forum_comment_count)
    _count(ctx, "qnas", qna_count)
    _count(ctx, "qna_answers", qna_answer_count)
    _count(ctx, "supports", support_count)
    _count(ctx, "support_replies", support_reply_count)
    _count(ctx, "lesson_comments", lesson_comment_count)
    _count(ctx, "carts", cart_count)
    _count(ctx, "wishlists", wishlist_count)
    _count(ctx, "notifications", notification_count)

    _seed_activity_logs(ctx, all_users, profile_settings)


def _seed_activity_logs(ctx: SeedContext, all_users: list[User], profile_settings: dict[str, int]) -> None:
    actions = ["REGISTER", "LOGIN", "ENROLL", "PAYMENT_SUCCESS", "VIEW_LESSON", "COMMENT"]
    created = 0
    for idx in range(profile_settings["activity_log_count"]):
        user = all_users[idx % len(all_users)]
        ActivityLog.objects.create(
            user=user,
            action=actions[idx % len(actions)],
            description=f"Curated activity event {idx + 1}",
            entity_type="Course",
            entity_id=(idx % 12) + 1,
            ip_address=f"10.0.0.{(idx % 200) + 1}",
            user_agent="CuratedSeedAgent/1.0",
        )
        created += 1

    _count(ctx, "activity_logs", created)


def _seed_platform_metadata(ctx: SeedContext, users_data: dict[str, Any], profile_settings: dict[str, int]) -> None:
    form = RegistrationForm.objects.create(
        type=RegistrationForm.FormType.INSTRUCTOR_APPLICATION,
        title="Instructor Application Form",
        description="Apply to become a course instructor.",
        is_active=True,
        version=2,
        created_by=users_data["admin_user"],
    )

    questions = [
        FormQuestion.objects.create(form=form, order=1, label="Specialization", type=FormQuestion.QuestionType.TEXT, required=True),
        FormQuestion.objects.create(form=form, order=2, label="Years of experience", type=FormQuestion.QuestionType.NUMBER, required=True),
        FormQuestion.objects.create(form=form, order=3, label="Portfolio URL", type=FormQuestion.QuestionType.URL, required=False),
    ]

    application_count = 0
    response_count = 0
    for idx, student in enumerate(users_data["students"][: profile_settings["application_count"]]):
        app = Application.objects.create(
            user=student,
            form=form,
            status=Application.Status.PENDING if idx < 2 else Application.Status.APPROVED,
            reviewed_by=users_data["admin_user"] if idx >= 2 else None,
            reviewed_at=ctx.now - timedelta(days=1) if idx >= 2 else None,
            admin_notes="Looks promising" if idx >= 2 else None,
        )
        application_count += 1

        answers = [
            f"Area {idx + 1}",
            2 + idx,
            f"https://portfolio.example.com/{student.username}",
        ]
        for question, answer in zip(questions, answers):
            ApplicationResponse.objects.create(application=app, question=question, value=answer)
            response_count += 1

    _count(ctx, "registration_forms", 1)
    _count(ctx, "form_questions", len(questions))
    _count(ctx, "applications", application_count)
    _count(ctx, "application_responses", response_count)

    _seed_default_system_settings(ctx, users_data)


def _seed_default_system_settings(ctx: SeedContext, users_data: dict[str, Any]) -> None:
    homepage_layout = [
        {
            "component": name,
            "enabled": True,
            "order": index + 1,
        }
        for index, name in enumerate(DEFAULT_HOMEPAGE_COMPONENTS)
    ]
    homepage_config = {
        "hero": {
            "headline": "Learn from experts, build your future",
            "subheadline": "Structured learning paths and practical outcomes.",
            "primary_cta": "Explore Courses",
            "secondary_cta": "Become an Instructor",
        }
    }

    settings_data = [
        ("general", "site_name", "EduPlatform", "Site display name"),
        (
            "general",
            "site_description",
            "Nền tảng học trực tuyến hàng đầu Việt Nam",
            "Site description",
        ),
        ("general", "contact_email", "support@eduplatform.vn", "Support contact email"),
        ("general", "contact_phone", "1900-xxxx", "Support contact phone"),
        ("payment", "vnpay_enabled", "true", "Enable VNPay payment method"),
        ("payment", "momo_enabled", "true", "Enable MoMo payment method"),
        ("payment", "min_payout", "500000", "Minimum instructor payout amount"),
        ("email", "smtp_host", "smtp.gmail.com", "SMTP host"),
        ("email", "smtp_port", "587", "SMTP port"),
        ("course", "max_upload_size", "524288000", "Maximum upload size in bytes"),
        ("course", "auto_approve", "false", "Auto approve new courses"),
        (
            "homepage",
            "homepage_layout",
            json.dumps(homepage_layout, ensure_ascii=False),
            "Default homepage layout components",
        ),
        (
            "homepage",
            "homepage_config",
            json.dumps(homepage_config, ensure_ascii=False),
            "Default homepage content configuration",
        ),
    ]

    for group, key, value, description in settings_data:
        SystemsSetting.objects.update_or_create(
            setting_key=key,
            defaults={
                "setting_group": group,
                "setting_value": value,
                "description": description,
                "admin": users_data.get("admin"),
            },
        )

    _count(ctx, "system_settings", len(settings_data))
