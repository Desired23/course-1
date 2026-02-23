from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .services import (
    create_notification,
    get_notification_by_id,
    get_notifications_by_user,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    delete_notification_by_admin,
    notification_to_users
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import NotificationSerializer
class NotificationView(APIView):
    def post(self, request):
        try:
            receiver_id = request.data.get('receiver_id') or request.data.get('user_id')  # Backward compatible
            sender = request.data.get('sender') or request.data.get('sender_id')  # Accept both sender and sender_id
            title = request.data.get('title')
            message = request.data.get('message')
            type = request.data.get('type')
            related_id = request.data.get('related_id')

            notification = create_notification(receiver_id, title, message, type, related_id, sender)
            return Response(notification, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def get(self, request, notification_id=None):
        try:
            if notification_id:
                notification = get_notification_by_id(notification_id)
                return Response(notification, status=status.HTTP_200_OK)
            else:
                user_id = request.query_params.get('user_id')
                notifications = get_notifications_by_user(user_id)
                return paginate_queryset(notifications, request, NotificationSerializer)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def put(self, request):
        try:
            notification_id = request.query_params.get('notification_id')
            if notification_id:
                notification = mark_notification_as_read(notification_id)
                return Response(notification, status=status.HTTP_200_OK)
            elif request.query_params.get('user_id'):
                notification = mark_all_notifications_as_read(request.query_params.get('user_id'))
                return Response(notification, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
class NotificationByAdminView(APIView):
    permission_classes = [RolePermissionFactory("admin")]
    def delete(self, request, notification_code):
        try:
            notification = delete_notification_by_admin(notification_code)
            return Response(notification, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def post(self, request):
        try:
            notification_code = request.data.get('notification_code')
            print(notification_code)
            user_ids = request.data.get('user_ids')
            title = request.data.get('title')
            message = request.data.get('message')
            type = request.data.get('type')
            related_id = request.data.get('related_id')

            if not user_ids or not title or not message or not type:
                raise ValidationError("All fields are required")
            notification = notification_to_users(notification_code, user_ids, title, message, type, related_id)
            return Response(notification, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        