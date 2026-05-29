from rest_framework.exceptions import ValidationError
from .models import Support
from .serializers import SupportSerializer


def _is_admin(user):
    return bool(getattr(user, 'admin', None))


def _assert_support_access(support, actor):
    if _is_admin(actor) or support.user_id == actor.id:
        return
    raise ValidationError("Bạn không có quyền truy cập ticket này.")


def create_support(data, actor):
    payload = dict(data)
    payload.pop('user', None)
    payload.pop('admin', None)
    payload.setdefault('name', actor.full_name)
    payload.setdefault('email', actor.email)
    serializer = SupportSerializer(data=payload)
    if serializer.is_valid(raise_exception=True):
        support = serializer.save(user=actor)
        return SupportSerializer(support).data
    raise ValidationError(serializer.errors)

def get_support_by_id(support_id, actor):
    try:
        support = Support.objects.get(id=support_id)
        _assert_support_access(support, actor)
        return SupportSerializer(support).data
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving support request: {str(e)}")

def get_supports_by_user(user_id, actor):
    try:
        if not _is_admin(actor) and actor.id != int(user_id):
            raise ValidationError("Bạn không có quyền xem ticket của người dùng khác.")
        supports = Support.objects.filter(user=user_id)
        return supports
    except Exception as e:
        raise ValidationError(f"Error retrieving support requests: {str(e)}")

def get_all_supports(actor):
    try:
        if _is_admin(actor):
            return Support.objects.all()
        return Support.objects.filter(user=actor)
    except Exception as e:
        raise ValidationError(f"Error retrieving all support requests: {str(e)}")


def update_support(support_id, data, actor):
    try:
        support = Support.objects.get(id=support_id)
        _assert_support_access(support, actor)
        payload = dict(data)
        payload.pop('user', None)
        if not _is_admin(actor):
            for field in ('admin', 'status', 'priority'):
                payload.pop(field, None)
        serializer = SupportSerializer(support, data=payload, partial=True)
        if serializer.is_valid(raise_exception=True):
            updated_support = serializer.save()
            return SupportSerializer(updated_support).data
        raise ValidationError(serializer.errors)
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error updating support request: {str(e)}")


def update_admin_id(support_id, admin_id, actor):
    if not _is_admin(actor):
        raise ValidationError("Bạn không có quyền gán ticket cho admin.")
    try:
        from admins.models import Admin
        support = Support.objects.get(id=support_id)
        support.admin = Admin.objects.get(id=admin_id)
        support.save()
        return SupportSerializer(support).data
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error updating admin ID: {str(e)}")


def delete_support(support_id, actor):
    try:
        supports = Support.objects.all()
        support = supports.get(id=support_id)
        _assert_support_access(support, actor)
        support.delete()
        return {"message": "Support request deleted successfully"}
    except Exception as e:
        raise ValidationError(f"Error deleting support request: {str(e)}")
