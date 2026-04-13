"""
API endpoint to reset DB and re-seed with demo data.
Protected by a secret key passed as query param.

Usage:  GET /api/seed-demo/?key=<SEED_SECRET_KEY>
"""
import json
import threading
from django.http import JsonResponse
from django.db import connection
from django.utils import timezone

from config.reseed_engine import (
    DEFAULT_PROFILE,
    get_default_strict_mode,
    get_reseed_status,
    get_seed_secret,
    start_reseed_run,
)


from subscription_plans.models import (
    SubscriptionUsage,
    UserSubscription,
    CourseSubscriptionConsent,
    PlanCourse,
    SubscriptionPlan,
)
from applications.models import ApplicationResponse, Application
from registration_forms.models import FormQuestion, RegistrationForm
from activity_logs.models import ActivityLog
from support_replies.models import SupportReply
from supports.models import Support
from systems_settings.models import SystemsSetting
from notifications.models import Notification
from instructor_payouts.models import InstructorPayout
from instructor_earnings.models import InstructorEarning
from payment_methods.models import InstructorPayoutMethod, UserPaymentMethod
from payment_details.models import Payment_Details
from payments.models import Payment
from wishlists.models import Wishlist
from carts.models import Cart
from promotions.models import Promotion
from qna_answers.models import QnAAnswer
from qnas.models import QnA
from forum_comments.models import ForumComment
from forum_topics.models import ForumTopic
from forums.models import Forum
from blog_comments.models import BlogComment
from blog_posts.models import BlogPost
from quiz_results.models import QuizResult
from quiz_questions.models import QuizQuestion, QuizTestCase
from reviews.models import Review
from certificates.models import Certificate
from learning_progress.models import LearningProgress
from enrollments.models import Enrollment
from lesson_comments.models import LessonComment
from lesson_attachments.models import LessonAttachment
from lessons.models import Lesson
from coursemodules.models import CourseModule
from courses.models import Course
from instructors.models import Instructor
from instructor_levels.models import InstructorLevel
from categories.models import Category
from admins.models import Admin
from users.models import User


SEED_SECRET = get_seed_secret()


_seed_lock = threading.Lock()
_seed_running = False


def _run_seed():
    """Delete all data then run seed_data.py"""
    global _seed_running
    print("[SEED] ==== BẮT ĐẦU RESET DỮ LIỆU ====")
    try:

        connection.close()


        print("🗑️  Clearing database...")
        SubscriptionUsage.objects.all().delete()
        UserSubscription.objects.all().delete()
        CourseSubscriptionConsent.objects.all().delete()
        PlanCourse.objects.all().delete()
        SubscriptionPlan.objects.all().delete()
        ApplicationResponse.objects.all().delete()
        Application.objects.all().delete()
        FormQuestion.objects.all().delete()
        RegistrationForm.objects.all().delete()
        ActivityLog.objects.all().delete()
        SupportReply.objects.all().delete()
        Support.objects.all().delete()
        SystemsSetting.objects.all().delete()
        Notification.objects.all().delete()
        InstructorPayout.objects.all().delete()
        InstructorEarning.objects.all().delete()
        InstructorPayoutMethod.objects.all().delete()
        UserPaymentMethod.objects.all().delete()
        Payment_Details.objects.all().delete()
        Payment.objects.all().delete()
        Wishlist.objects.all().delete()
        Cart.objects.all().delete()
        Promotion.objects.all().delete()
        QnAAnswer.objects.all().delete()
        QnA.objects.all().delete()
        ForumComment.objects.all().delete()
        ForumTopic.objects.all().delete()
        Forum.objects.all().delete()
        BlogComment.objects.all().delete()
        BlogPost.objects.all().delete()
        QuizResult.objects.all().delete()
        QuizTestCase.objects.all().delete()
        QuizQuestion.objects.all().delete()
        Review.objects.all().delete()
        Certificate.objects.all().delete()
        LearningProgress.objects.all().delete()
        Enrollment.objects.all().delete()
        LessonComment.objects.all().delete()
        LessonAttachment.objects.all().delete()
        Lesson.objects.all().delete()
        CourseModule.objects.all().delete()
        Course.objects.all().delete()
        Instructor.objects.all().delete()
        InstructorLevel.objects.all().delete()
        Category.objects.all().delete()
        Admin.objects.all().delete()
        User.objects.all().delete()


        try:
            from realtime.models import ChatMessage, ChatRoom
            ChatMessage.objects.all().delete()
            ChatRoom.objects.all().delete()
        except Exception:
            pass

        print("✅ Database cleared!")


        print("🌱 Running seed_data.py...")
        import importlib, sys
        if 'seed_data' in sys.modules:
            importlib.reload(sys.modules['seed_data'])
        else:
            import seed_data
        print("✅ Seed complete!")
        print("[SEED] ==== RESET DỮ LIỆU THÀNH CÔNG ====")

    except Exception as e:
        print(f"❌ Seed error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        _seed_running = False


def seed_demo_view(request):
    """GET /api/seed-demo/?key=xxx"""
    global _seed_running


    key = request.GET.get('key', '')
    if key != SEED_SECRET:
        return JsonResponse({'error': 'Invalid key'}, status=403)


    with _seed_lock:
        if _seed_running:
            return JsonResponse({'message': 'Seed is already running. Please wait...'}, status=429)
        _seed_running = True


    thread = threading.Thread(target=_run_seed, daemon=True)
    thread.start()

    return JsonResponse({
        'message': '🌱 Seed started! Database is being reset with demo data. This takes ~30 seconds.',
        'status': 'running',
        'note': 'Data will be available shortly. Refresh your app after ~30s.',
    })


def seed_status_view(request):
    """GET /api/seed-demo/status/"""
    return JsonResponse({
        'running': _seed_running,
        'message': 'Seed is running...' if _seed_running else 'No seed in progress.',
    })


def _extract_request_key(request, payload):
    """Read seed key from JSON body, query string, or header."""
    if payload.get('key'):
        return payload.get('key')

    query_key = request.GET.get('key', '')
    if query_key:
        return query_key

    return request.headers.get('X-Seed-Key', '')


def _parse_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {'1', 'true', 'yes', 'y', 'on'}


def reseed_demo_view(request):
    """GET/POST /api/reseed-demo/ to run full business reset + reseed job."""
    if request.method not in ('GET', 'POST'):
        return JsonResponse({'error': 'Method not allowed. Use GET or POST.'}, status=405)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8')) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)
    else:
        payload = request.GET.dict()

    key = _extract_request_key(request, payload)
    if key != SEED_SECRET:
        return JsonResponse({'error': 'Invalid key'}, status=403)

    profile = str(payload.get('profile', DEFAULT_PROFILE)).strip().lower()
    dry_run = _parse_bool(payload.get('dry_run'), default=False)
    strict_mode = _parse_bool(payload.get('strict_mode'), default=get_default_strict_mode())
    preserve_home_settings = _parse_bool(payload.get('preserve_home_settings'), default=True)
    random_seed = payload.get('random_seed', int(timezone.now().strftime('%Y%m%d')))

    try:
        random_seed = int(random_seed)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'random_seed must be an integer.'}, status=400)

    try:
        started, run_state = start_reseed_run(
            profile=profile,
            random_seed=random_seed,
            dry_run=dry_run,
            strict_mode=strict_mode,
            preserve_home_settings=preserve_home_settings,
        )
    except ValueError as exc:
        return JsonResponse({'error': str(exc)}, status=400)

    if not started:
        return JsonResponse(
            {
                'message': 'A reseed run is already in progress.',
                'status': run_state,
            },
            status=429,
        )

    return JsonResponse(
        {
            'message': 'Reseed started successfully.',
            'status': run_state,
        },
        status=202,
    )


def reseed_status_view(request):
    """GET /api/reseed-demo/status/ returns latest reseed run status."""
    return JsonResponse(get_reseed_status())
