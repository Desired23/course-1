from django.http import JsonResponse

from .copyright_services import process_overdue_cases


def process_overdue_view(request):
    """Endpoint chạy xử lý quá hạn bản quyền.
    Endpoint test, KHONG validate quyen -> goi truc tiep tu trinh duyet.
    """
    result = process_overdue_cases()
    return JsonResponse({"message": "Overdue copyright cases processed.", **result})
