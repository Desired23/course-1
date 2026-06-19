from django.http import JsonResponse

from utils.cron import read_payload, check_cron_key


def _guard(request):
    """Trả (payload, None) nếu key hợp lệ, ngược lại (None, JsonResponse lỗi)."""
    payload, error = read_payload(request)
    if error:
        return None, error
    if not check_cron_key(request, payload):
        return None, JsonResponse({"error": "Invalid key"}, status=403)
    return payload, None


def expire_suspend_view(request):
    """Hết hạn subscription quá hạn và suspend enrollment liên quan."""
    _, error = _guard(request)
    if error:
        return error
    from .services import expire_subscriptions_and_suspend_enrollments
    return JsonResponse(expire_subscriptions_and_suspend_enrollments())


def notify_expiry_view(request):
    """Gửi thông báo cho các subscription sắp hết hạn."""
    _, error = _guard(request)
    if error:
        return error
    from .services import send_subscription_expiry_notifications
    return JsonResponse(send_subscription_expiry_notifications())


def process_removals_view(request):
    """Xử lý các khóa học được lên lịch gỡ khỏi plan."""
    _, error = _guard(request)
    if error:
        return error
    from .services import process_scheduled_plan_course_removals
    return JsonResponse(process_scheduled_plan_course_removals())
