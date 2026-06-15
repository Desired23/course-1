import json
import os


def get_cron_secret():
    return os.getenv("CRON_SECRET_KEY", "demo-cron-2026")


def read_payload(request):
    """Đọc payload cho cron endpoint (POST JSON hoặc GET query). Trả (payload, error_response)."""
    from django.http import JsonResponse

    if request.method not in ("GET", "POST"):
        return None, JsonResponse({"error": "Method not allowed. Use GET or POST."}, status=405)
    if request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8")) if request.body else {}
        except json.JSONDecodeError:
            return None, JsonResponse({"error": "Invalid JSON payload."}, status=400)
    else:
        payload = request.GET.dict()
    return payload, None


def check_cron_key(request, payload):
    """True nếu key hợp lệ (qua ?key=, body 'key', hoặc header X-Cron-Key)."""
    provided = (
        payload.get("key")
        or request.GET.get("key", "")
        or request.headers.get("X-Cron-Key", "")
    )
    return provided == get_cron_secret()
