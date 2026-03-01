from rest_framework.exceptions import ValidationError
from .models import Admin
from .serializers import AdminSerializer
from users.models import User
from activity_logs.services import log_activity

def create_admin(data, request=None):
    try:
        try:
            userCheck = User.objects.get(id=data['user_id'])
        except User.DoesNotExist:
            raise ValidationError({"error": "User not found."})
        serializer = AdminSerializer(data={
            'user_id': userCheck.id,
            'department': data['department'],
            'role': data['role'],
        })
        if serializer.is_valid():
            admin = serializer.save()
            log_activity(
                request=request,
                action="CREATE",
                entity_type="Admin",
                entity_id=admin.id,
                description=f"Tạo admin cho user_id={userCheck.id}"
            )
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating admin: {str(e)}")

def get_admin_by_id(admin_id):
    try:
        admin = Admin.objects.get(id=admin_id)
        return AdminSerializer(admin).data
    except Admin.DoesNotExist:
        raise ValidationError("Admin not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving admin: {str(e)}")

def get_admins():
    try:
        admins = Admin.objects.all()
        return admins
    except Exception as e:
        raise ValidationError(f"Error retrieving admins: {str(e)}")

def update_admin(admin_id, data, request=None):
    try:
        admin = Admin.objects.get(id=admin_id)
    except Admin.DoesNotExist:
        raise ValidationError({"error": "Admin not found."})

    serializer = AdminSerializer(admin, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        serializer.save()
        log_activity(
            request=request,
            action="UPDATE",
            entity_type="Admin",
            entity_id=admin.id,
            description=f"Cập nhật admin ID {admin_id}"
        )
        return serializer.data
    raise ValidationError(serializer.errors)

def delete_admin(admin_id, request=None):
    try:
        admin = Admin.objects.get(id=admin_id)
        admin.delete()
        log_activity(
            request=request,
            action="DELETE",
            entity_type="Admin",
            entity_id=admin_id,
            description=f"Xóa admin ID {admin_id}"
        )
        return {"message": "Admin deleted successfully"}
    except Admin.DoesNotExist:
        raise ValidationError({"error": "Admin not found."})
    except Exception as e:
        raise ValidationError(f"Error deleting admin: {str(e)}")