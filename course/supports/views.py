from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .services import (
    create_support,
    get_support_by_id,
    get_supports_by_user,
    get_all_supports,
    update_support,
    update_admin_id,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import SupportSerializer

class SupportListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    def post(self, request):
        try:
            data = request.data
            support = create_support(data)
            return Response(support, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        try:
            if 'support_id' in request.query_params:
                support_id = request.query_params.get('support_id')
                support = get_support_by_id(support_id)
                return Response(support, status=status.HTTP_200_OK)
            elif 'user_id' in request.query_params:
                user_id = request.query_params.get('user_id')
                supports = get_supports_by_user(user_id)
                return paginate_queryset(supports, request, SupportSerializer)
            else:
                supports = get_all_supports()
                return paginate_queryset(supports, request, SupportSerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, support_id):
        try:
            support = update_support(support_id, request.data)
            return Response(support, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, support_id):
        try:
            admin_id = request.data.get('admin_id')
            updated_support = update_admin_id(support_id, admin_id)
            return Response(updated_support, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)
