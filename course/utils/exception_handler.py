import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_handler

logger = logging.getLogger(__name__)

_STATUS_MESSAGES = {
    status.HTTP_400_BAD_REQUEST: "Dữ liệu không hợp lệ.",
    status.HTTP_401_UNAUTHORIZED: "Bạn chưa đăng nhập hoặc phiên đã hết hạn.",
    status.HTTP_403_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    status.HTTP_404_NOT_FOUND: "Không tìm thấy tài nguyên.",
    status.HTTP_429_TOO_MANY_REQUESTS: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "Lỗi hệ thống. Vui lòng thử lại sau.",
}


def _normalize_detail(detail):
    if isinstance(detail, dict):
        return detail
    if isinstance(detail, list):
        return {"non_field_errors": detail}
    return {"non_field_errors": [str(detail)]}


def custom_exception_handler(exc, context):
    # Let DRF convert Http404 / Django PermissionDenied first
    if isinstance(exc, Http404):
        exc = NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = PermissionDenied()

    response = drf_default_handler(exc, context)

    if response is None:
        # Unhandled exception — log and return 500
        logger.exception(
            "Unhandled exception in view %s",
            context.get("view", "unknown"),
            exc_info=exc,
        )
        return Response(
            {"message": _STATUS_MESSAGES[status.HTTP_500_INTERNAL_SERVER_ERROR]},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    http_status = response.status_code
    default_message = _STATUS_MESSAGES.get(http_status, "Đã xảy ra lỗi.")

    if isinstance(exc, ValidationError):
        errors = _normalize_detail(exc.detail)
        # Build a human-readable message from first error if not already a plain string
        first_error = None
        if isinstance(errors, dict):
            for v in errors.values():
                first_error = v[0] if isinstance(v, list) else v
                break
        payload = {
            "message": str(first_error) if first_error else default_message,
            "errors": errors,
        }
    elif isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        payload = {"message": _STATUS_MESSAGES[status.HTTP_401_UNAUTHORIZED]}
    elif isinstance(exc, PermissionDenied):
        payload = {"message": str(exc.detail) if exc.detail else _STATUS_MESSAGES[status.HTTP_403_FORBIDDEN]}
    elif isinstance(exc, NotFound):
        payload = {"message": str(exc.detail) if exc.detail else _STATUS_MESSAGES[status.HTTP_404_NOT_FOUND]}
    elif isinstance(exc, Throttled):
        payload = {"message": _STATUS_MESSAGES[status.HTTP_429_TOO_MANY_REQUESTS]}
    else:
        payload = {"message": default_message}

    response.data = payload
    return response
