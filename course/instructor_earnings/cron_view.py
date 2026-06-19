from datetime import timedelta

from django.db.models import Max, Min
from django.http import JsonResponse
from django.utils import timezone

from utils.cron import read_payload, check_cron_key


def calculate_subscription_earnings_view(request):
    """Tính earning subscription (PENDING).

    Cron endpoint: bảo vệ bằng CRON_SECRET_KEY (?key= / body 'key' / header X-Cron-Key).
    - Mac dinh: tinh thang truoc.
    - ?year=&month=: tinh dung thang do.
    - ?all=true: quet moi thang co subscription va tinh het mot luot (back-fill thang sot).
    """
    payload, error = read_payload(request)
    if error:
        return error
    if not check_cron_key(request, payload):
        return JsonResponse({"error": "Invalid key"}, status=403)

    from .services import calculate_subscription_earnings_for_month

    if request.GET.get("all") in ("true", "1", "yes"):
        from subscription_plans.models import UserSubscription

        bounds = UserSubscription.objects.filter(
            payment__isnull=False, is_deleted=False,
        ).aggregate(
            first=Min("start_date"),
            last_start=Max("start_date"),
            last_end=Max("end_date"),
        )
        first = bounds["first"]
        if first is None:
            return JsonResponse({"message": "Khong co subscription nao.", "months": []})

        # Ky subscription co the keo dai qua thang bat dau (vd: goi nam),
        # nen quet den thang muon nhat trong [max(start_date), max(end_date)].
        last_candidates = [d for d in (bounds["last_start"], bounds["last_end"]) if d is not None]
        last = max(last_candidates)

        results = []
        year, month = first.year, first.month
        while (year, month) <= (last.year, last.month):
            results.append(calculate_subscription_earnings_for_month(year, month))
            month += 1
            if month > 12:
                year, month = year + 1, 1
        return JsonResponse({"message": "Calculated all months.", "count": len(results), "months": results})

    year_raw = request.GET.get("year")
    month_raw = request.GET.get("month")

    if year_raw and month_raw:
        try:
            year = int(year_raw)
            month = int(month_raw)
        except ValueError:
            return JsonResponse({"error": "year va month phai la so nguyen."}, status=400)
    else:
        prev = timezone.now().replace(day=1) - timedelta(days=1)
        year, month = prev.year, prev.month

    if not (1 <= month <= 12) or year < 2000:
        return JsonResponse({"error": "year va month khong hop le."}, status=400)

    result = calculate_subscription_earnings_for_month(year, month)
    return JsonResponse(result)
