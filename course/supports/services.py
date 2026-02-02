from rest_framework.exceptions import ValidationError
from .models import Support
from .serializers import SupportSerializer

def create_support(data):
    serializer = SupportSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        support = serializer.save()
        return support
    raise ValidationError(serializer.errors)

def get_support_by_id(support_id):
    try:
        support = Support.objects.get(id=support_id)
        return SupportSerializer(support).data
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving support request: {str(e)}")

def get_supports_by_user(user_id):
    try:
        supports = Support.objects.filter(user_id=user_id)
        if not supports.exists():
            raise ValidationError("No support requests found for this user.")
        return SupportSerializer(supports, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving support requests: {str(e)}")

def get_all_supports():
    try:
        supports = Support.objects.all()
        if not supports.exists():
            raise ValidationError("No support requests found.")
        return SupportSerializer(supports, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving all support requests: {str(e)}")

def update_support(support_id, data):
    try:
        support = Support.objects.get(id=support_id)
        serializer = SupportSerializer(support, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            updated_support = serializer.save()
            return updated_support
        raise ValidationError(serializer.errors)
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error updating support request: {str(e)}")

def update_admin_id(support_id, admin_id):
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

def delete_support(support_id):
    try:
        support = Support.objects.get(id=support_id)
        support.delete()
        return {"message": "Support request deleted successfully"}
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error deleting support request: {str(e)}")