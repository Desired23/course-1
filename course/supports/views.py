from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db.models import Q
from .services import (
    create_support,
    get_support_by_id,
    get_supports_by_user,
    get_all_supports,
    update_support,
    update_admin_id,
    delete_support,
    resolve_support_request,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import SupportSerializer

class SupportListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'support'
    def post(self, request):
        try:
            data = request.data
            support = create_support(data, actor=request.user)
            return Response(support, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        try:
            if 'support_id' in request.query_params:
                support_id = request.query_params.get('support_id')
                support = get_support_by_id(support_id, actor=request.user)
                return Response(support, status=status.HTTP_200_OK)
            elif 'user_id' in request.query_params:
                user_id = request.query_params.get('user_id')
                supports = get_supports_by_user(user_id, actor=request.user)

                status_filter = request.query_params.get('status')
                priority_filter = request.query_params.get('priority')
                search = (request.query_params.get('search') or '').strip()
                sort_by = request.query_params.get('sort_by')

                if status_filter:
                    supports = supports.filter(status=status_filter)
                if priority_filter:
                    supports = supports.filter(priority=priority_filter)
                if search:
                    supports = supports.filter(
                        Q(subject__icontains=search) | Q(message__icontains=search)
                    )

                if sort_by == 'oldest':
                    supports = supports.order_by('created_at')
                elif sort_by == 'updated_desc':
                    supports = supports.order_by('-updated_at')
                else:
                    supports = supports.order_by('-created_at')

                return paginate_queryset(supports, request, SupportSerializer)
            else:
                supports = get_all_supports(actor=request.user)
                ticket_type = request.query_params.get('ticket_type')
                status_filter = request.query_params.get('status')
                if ticket_type:
                    supports = supports.filter(ticket_type=ticket_type)
                if status_filter:
                    supports = supports.filter(status=status_filter)
                return paginate_queryset(supports, request, SupportSerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, support_id):
        try:
            support = update_support(support_id, request.data, actor=request.user)
            return Response(support, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, support_id):
        try:
            admin_id = request.data.get('admin_id')
            updated_support = update_admin_id(support_id, admin_id, actor=request.user)
            return Response(updated_support, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, support_id):
        try:
            result = delete_support(support_id, actor=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SupportResolveView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def post(self, request, support_id):
        try:
            result = resolve_support_request(
                support_id,
                request.data.get('action'),
                actor=request.user,
                notes=request.data.get('notes', ''),
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)
