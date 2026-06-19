from django.http import JsonResponse

from utils.cron import read_payload, check_cron_key


def settle_earnings_view(request):
    """Đẩy các earning đã qua hạn refund từ PENDING -> AVAILABLE.
    Cron endpoint: bảo vệ bằng CRON_SECRET_KEY (?key= / body 'key' / header X-Cron-Key).
    """
    payload, error = read_payload(request)
    if error:
        return error
    if not check_cron_key(request, payload):
        return JsonResponse({"error": "Invalid key"}, status=403)

    from instructor_earnings.services import update_earnings_available
    settled = update_earnings_available().count()
    return JsonResponse({"message": "Earnings settled to AVAILABLE.", "settled_to_available": settled})


def run_payouts_view(request):
    """Settle earning rồi tự chi trả định kỳ theo đợt cho từng instructor.
    Cron endpoint: bảo vệ bằng CRON_SECRET_KEY. Payout tạo ra ở trạng thái PROCESSED.
    """
    payload, error = read_payload(request)
    if error:
        return error
    if not check_cron_key(request, payload):
        return JsonResponse({"error": "Invalid key"}, status=403)

    from .services import auto_create_instructor_payouts
    result = auto_create_instructor_payouts(processed_by=None, notes='Auto cron payout run', settle_first=True)
    return JsonResponse({"message": "Payout run completed.", **result})
