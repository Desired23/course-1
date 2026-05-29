from urllib.parse import urlparse

from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import ValidationError


RETURN_URL_CACHE_TIMEOUT_SECONDS = 60 * 60 * 6


def _normalize_origin(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.hostname
    if not host:
        return ""
    scheme = parsed.scheme.lower()
    port = parsed.port
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        return f"{scheme}://{host}:{port}"
    return f"{scheme}://{host}"


def _get_allowed_origins() -> set[str]:
    configured = list(getattr(settings, "PAYMENT_RETURN_URL_ALLOWLIST", []) or [])
    configured.extend(getattr(settings, "PAYMENT_RETURN_ALLOWED_ORIGINS", []) or [])
    origins = set()
    for item in configured:
        origin = _normalize_origin(item)
        if origin:
            origins.add(origin)
    return origins


def validate_and_normalize_return_url(return_url: str) -> str:
    if not return_url or not str(return_url).strip():
        raise ValidationError("return_url là bắt buộc.")

    parsed = urlparse(str(return_url).strip())
    if parsed.scheme not in {"http", "https"}:
        raise ValidationError("return_url phải dùng http hoặc https.")
    if not parsed.netloc:
        raise ValidationError("return_url phải là URL tuyệt đối.")

    origin = _normalize_origin(return_url)
    allowed_origins = _get_allowed_origins()
    if origin not in allowed_origins:
        raise ValidationError("return_url không thuộc allowlist domain.")

    path = parsed.path or "/payment/result"
    normalized = f"{origin}{path}".rstrip("/")
    return normalized


def _cache_key(payment_id: int | str) -> str:
    return f"payments:return-url:{payment_id}"


def store_payment_return_url(payment_id: int | str, return_url: str) -> None:
    cache.set(_cache_key(payment_id), return_url, timeout=RETURN_URL_CACHE_TIMEOUT_SECONDS)


def resolve_payment_return_url(payment_id: int | str, default_url: str) -> str:
    cached = cache.get(_cache_key(payment_id))
    if cached:
        return str(cached)
    return default_url
