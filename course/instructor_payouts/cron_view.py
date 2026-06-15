from django.http import JsonResponse


def settle_earnings_view(request):
    """Đẩy các earning đã qua hạn refund từ PENDING -> AVAILABLE.
    Endpoint test, KHONG validate quyen -> goi truc tiep tu trinh duyet.
    """
    from instructor_earnings.services import update_earnings_available
    settled = update_earnings_available().count()
    return JsonResponse({"message": "Earnings settled to AVAILABLE.", "settled_to_available": settled})


def run_payouts_view(request):
    """Settle earning rồi tự tạo payout PENDING theo đợt cho từng instructor.
    Endpoint test, KHONG validate quyen -> goi truc tiep tu trinh duyet.
    Payout tạo ra vẫn ở PENDING, chờ admin duyệt.
    """
    from .services import auto_create_instructor_payouts
    result = auto_create_instructor_payouts(processed_by=None, notes='Auto cron payout run', settle_first=True)
    return JsonResponse({"message": "Payout run completed.", **result})
