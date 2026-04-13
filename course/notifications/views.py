from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q, Count, Max
from django.utils import timezone
from enrollments.models import Enrollment
from courses.models import Course
from .services import (
    create_notification,
    get_notification_by_id,
    get_notifications_by_user,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    delete_notification_by_admin,
    notification_to_users,
    revoke_notification_batch,
    update_notification_batch,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .models import Notification
from .serializers import NotificationSerializer


def _announcement_month_start():
    now = timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _announcement_type_code(announcement_type):
    normalized = (announcement_type or '').strip().lower()
    if normalized not in ['educational', 'promotional']:
        raise ValidationError("announcement_type must be 'educational' or 'promotional'")
    return normalized


def _announcement_monthly_limit(announcement_type):
    return 4 if announcement_type == 'educational' else 2


def _build_announcement_code(announcement_type):
    return f"announcement_{announcement_type}_{timezone.now().strftime('%Y%m%d%H%M%S%f')}"
class NotificationView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'notification'
    def post(self, request):
        try:
            receiver_id = request.data.get('receiver_id') or request.data.get('user_id')
            sender = request.data.get('sender') or request.data.get('sender_id')
            title = request.data.get('title')
            message = request.data.get('message')
            type = request.data.get('type')
            related_id = request.data.get('related_id')
            notification_code = request.data.get('notification_code')

            notification = create_notification(receiver_id, title, message, type, related_id, sender, notification_code)
            return Response(notification, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def get(self, request, notification_id=None):
        try:
            if notification_id:
                notification = get_notification_by_id(notification_id, request.user.id)
                return Response(notification, status=status.HTTP_200_OK)
            else:
                user_id = request.user.id
                notifications = get_notifications_by_user(user_id)
                type_filter = request.query_params.get('type')
                is_read = request.query_params.get('is_read')
                search = (request.query_params.get('search') or '').strip()
                sort_by = request.query_params.get('sort_by')

                if type_filter:
                    notifications = notifications.filter(type=type_filter)
                if is_read in ['true', 'false']:
                    notifications = notifications.filter(is_read=(is_read == 'true'))
                if search:
                    notifications = notifications.filter(
                        Q(title__icontains=search) | Q(message__icontains=search)
                    )

                if sort_by == 'oldest':
                    notifications = notifications.order_by('created_at')
                else:
                    notifications = notifications.order_by('-created_at')

                return paginate_queryset(notifications, request, NotificationSerializer)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def put(self, request):
        try:
            notification_id = request.query_params.get('notification_id')
            if notification_id:
                notification = mark_notification_as_read(notification_id, request.user.id)
                return Response(notification, status=status.HTTP_200_OK)
            notification = mark_all_notifications_as_read(request.user.id)
            return Response(notification, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationByAdminView(APIView):
    permission_classes = [RolePermissionFactory("admin")]
    throttle_scope = 'burst'
    def delete(self, request, notification_code):
        try:
            notification = delete_notification_by_admin(notification_code)
            return Response(notification, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def post(self, request):
        try:
            notification_code = request.data.get('notification_code')
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

class InstructorAnnouncementView(APIView):
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'notification'

    def get(self, request):
        try:
            notifications = Notification.objects.filter(
                sender=request.user,
                notification_code__startswith='announcement_',
                is_deleted=False,
            )

            announcement_type = request.query_params.get('announcement_type')
            if announcement_type and announcement_type != 'all':
                code = _announcement_type_code(announcement_type)
                notifications = notifications.filter(notification_code__startswith=f'announcement_{code}_')

            history = (
                notifications
                .values('notification_code', 'title', 'message', 'related_id')
                .annotate(
                    recipient_count=Count('id'),
                    read_count=Count('id', filter=Q(is_read=True)),
                    sent_at=Max('created_at'),
                )
                .order_by('-sent_at')
            )

            results = []
            for item in history:
                parts = (item['notification_code'] or '').split('_')
                batch_type = parts[1] if len(parts) > 1 else 'educational'
                recipient_count = item['recipient_count'] or 0
                read_count = item['read_count'] or 0
                open_rate = round((read_count / recipient_count) * 100) if recipient_count else 0
                results.append({
                    'notification_code': item['notification_code'],
                    'type': batch_type,
                    'title': item['title'],
                    'content': item['message'],
                    'target_course': 'all' if item['related_id'] is None else str(item['related_id']),
                    'recipient_count': recipient_count,
                    'open_rate': open_rate,
                    'sent_at': item['sent_at'],
                })

            return Response({'results': results}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            announcement_type = _announcement_type_code(request.data.get('announcement_type') or request.data.get('type'))
            title = (request.data.get('title') or '').strip()
            message = (request.data.get('message') or request.data.get('content') or '').strip()
            target_course = request.data.get('target_course') or request.data.get('targetCourse') or 'all'

            if not title or not message:
                raise ValidationError("title and message are required")

            month_start = _announcement_month_start()
            monthly_count = (
                Notification.objects
                .filter(
                    sender=request.user,
                    notification_code__startswith=f'announcement_{announcement_type}_',
                    created_at__gte=month_start,
                    is_deleted=False,
                )
                .values('notification_code')
                .distinct()
                .count()
            )
            monthly_limit = _announcement_monthly_limit(announcement_type)
            if monthly_count >= monthly_limit:
                raise ValidationError(
                    f"Monthly limit reached for {announcement_type} announcements ({monthly_limit}/month)."
                )

            enrollment_qs = Enrollment.objects.filter(
                course__instructor__user=request.user,
                is_deleted=False,
            ).exclude(course__isnull=True)

            if target_course != 'all':
                try:
                    course_id = int(target_course)
                except (TypeError, ValueError):
                    raise ValidationError("target_course must be 'all' or a valid course id")

                course_exists = Course.objects.filter(
                    id=course_id,
                    instructor__user=request.user,
                    is_deleted=False,
                ).exists()
                if not course_exists:
                    raise ValidationError("Course not found or you do not own this course.")
                enrollment_qs = enrollment_qs.filter(course_id=course_id)
                related_id = course_id
            else:
                related_id = None

            user_ids = list(
                enrollment_qs.values_list('user_id', flat=True).distinct()
            )
            if not user_ids:
                raise ValidationError("No enrolled students found for the selected audience.")

            notification_code = _build_announcement_code(announcement_type)
            result = notification_to_users(
                notification_code=notification_code,
                user_ids=user_ids,
                title=title,
                message=message,
                type='other',
                related_id=related_id,
                sender=request.user,
            )

            read_count = Notification.objects.filter(notification_code=notification_code, is_read=True).count()
            recipient_count = result.get('sent', 0)
            open_rate = round((read_count / recipient_count) * 100) if recipient_count else 0
            return Response({
                'notification_code': notification_code,
                'type': announcement_type,
                'title': title,
                'content': message,
                'target_course': 'all' if related_id is None else str(related_id),
                'recipient_count': recipient_count,
                'open_rate': open_rate,
                'sent_at': timezone.now(),
                'monthly_count': monthly_count + 1,
                'monthly_limit': monthly_limit,
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        try:
            notification_code = request.query_params.get('notification_code')
            result = revoke_notification_batch(notification_code, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def patch(self, request):
        try:
            notification_code = request.query_params.get('notification_code') or request.data.get('notification_code')
            title = request.data.get('title')
            message = request.data.get('message') or request.data.get('content')
            result = update_notification_batch(
                notification_code=notification_code,
                actor=request.user,
                title=title,
                message=message,
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
