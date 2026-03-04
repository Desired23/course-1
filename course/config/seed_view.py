"""
API endpoint to reset DB and re-seed with demo data.
Protected by a secret key passed as query param.

Usage:  GET /api/seed-demo/?key=<SEED_SECRET_KEY>
"""
import threading
from django.http import JsonResponse
from django.conf import settings
import os


SEED_SECRET = os.getenv('SEED_SECRET_KEY', 'demo-seed-2026')

# Track if seed is currently running
_seed_lock = threading.Lock()
_seed_running = False


def _run_seed():
    """Delete all data then run seed_data.py"""
    global _seed_running

    print("[SEED] ==== BẮT ĐẦU RESET DỮ LIỆU ====")
    # Close any stale DB connections first
    connection.close()

    # ── Delete all data (order matters for FK constraints) ──
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

    # Also clean realtime chat tables
    try:
        from realtime.models import ChatMessage, ChatRoom
        ChatMessage.objects.all().delete()
        ChatRoom.objects.all().delete()
    except Exception:
        pass

    print("✅ Database cleared!")

    # ── Run seed script ──
    print("🌱 Running seed_data.py...")
    import importlib, sys
    if 'seed_data' in sys.modules:
        # Already imported in a previous run — just reload
        importlib.reload(sys.modules['seed_data'])
    else:
        # First run in this process — import executes top-level code
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

    # Check secret key
    key = request.GET.get('key', '')
    if key != SEED_SECRET:
        return JsonResponse({'error': 'Invalid key'}, status=403)

    # Prevent concurrent runs
    with _seed_lock:
        if _seed_running:
            return JsonResponse({'message': 'Seed is already running. Please wait...'}, status=429)
        _seed_running = True

    # Run in background thread so request doesn't timeout
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
