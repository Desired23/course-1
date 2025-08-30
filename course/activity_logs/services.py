from rest_framework.exceptions import ValidationError
from users.models import User
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from django.utils.timezone import now
def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

def log_activity(request = None, action = None, description = None, entity_type = None, entity_id = None, user_id = None):
    print("Logging activity:", {
        "action": action,
        "description": description,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": user_id,
        "request": request.user if request else None,
    })
    if not action:
        raise ValidationError("Action is required to log activity.")
    user = None
    if user_id:
        user = User.objects.filter(user_id=user_id).first()
    elif request and hasattr(request, "user") and isinstance(request.user, User):
        user = request.user
    ip_address = None
    user_agent = None
    if request:
        ip_address = get_client_ip(request) 
        user_agent = request.META.get("HTTP_USER_AGENT", None)
    data = ActivityLog.objects.create(
        user_id=user if user else None,
        action=action,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at = now()
    )
    serializer = ActivityLogSerializer(data)
    return serializer.data

def get_activity_logs(filters=None):
    if filters is None:
        filters = {}
    logs = ActivityLog.objects.filter(**filters).order_by('-created_at')
    serializer = ActivityLogSerializer(logs, many=True)
    return serializer.data
def delete_old_logs(cutoff_date):
    deleted_count, _ = ActivityLog.objects.filter(created_at__lt=cutoff_date).delete()
    return deleted_count