from django.http import JsonResponse
from django.utils import timezone

from utils.cron import read_payload, check_cron_key


def reconcile_payments_view(request):
    """Dò payment COMPLETED bị lệch (thiếu payment detail / enrollment).
    ?fix=true để tự tạo enrollment còn thiếu. Bảo vệ bằng CRON_SECRET_KEY.
    """
    payload, error = read_payload(request)
    if error:
        return error
    if not check_cron_key(request, payload):
        return JsonResponse({"error": "Invalid key"}, status=403)

    from payments.models import Payment
    from payment_details.models import Payment_Details
    from enrollments.models import Enrollment
    from enrollments.services import create_enrollment

    fix = (payload.get("fix") or request.GET.get("fix", "")) in ("true", "1", "yes")
    payments = Payment.objects.filter(payment_status=Payment.PaymentStatus.COMPLETED)
    issues = []
    fixed = 0
    for payment in payments:
        details = Payment_Details.objects.filter(payment=payment, is_deleted=False)
        if not details.exists():
            issues.append(f"Payment {payment.id} has no details (total_amount={payment.total_amount})")
            continue
        for detail in details:
            course = detail.course
            if not course:
                issues.append(f"PaymentDetail {detail.id} missing course")
                continue
            enrolled = Enrollment.objects.filter(
                user=payment.user, course=course, is_deleted=False
            ).exists()
            if not enrolled:
                msg = f"User {payment.user_id} not enrolled in course {course.id} for payment {payment.id}"
                if fix:
                    create_enrollment({
                        "user_id": payment.user_id,
                        "course_id": course.id,
                        "payment": payment.id,
                        "source": Enrollment.Source.PURCHASE,
                    })
                    fixed += 1
                    msg += " (enrollment created)"
                issues.append(msg)

    return JsonResponse({
        "message": "Reconcile completed.",
        "checked": payments.count(),
        "issues": len(issues),
        "fixed": fixed,
        "fix_mode": fix,
        "details": issues,
    })


def alert_ipn_failures_view(request):
    """Cảnh báo các payment PENDING quá 1 giờ (nghi IPN fail). Bảo vệ bằng CRON_SECRET_KEY."""
    payload, error = read_payload(request)
    if error:
        return error
    if not check_cron_key(request, payload):
        return JsonResponse({"error": "Invalid key"}, status=403)

    from payments.models import Payment

    threshold = timezone.now() - timezone.timedelta(hours=1)
    stale = Payment.objects.filter(
        payment_status=Payment.PaymentStatus.PENDING,
        created_at__lt=threshold,
    )
    return JsonResponse({
        "message": "IPN failure scan completed.",
        "stale_pending": stale.count(),
        "payments": [{"id": p.id, "created_at": p.created_at} for p in stale],
    })
