from rest_framework.exceptions import ValidationError
from .models import Admin
from .serializers import AdminSerializer
from users.models import User

def create_admin(data):
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
            serializer.save()
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
        return AdminSerializer(admins, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving admins: {str(e)}")

def update_admin(admin_id, data):
    try:
        admin = Admin.objects.get(id=admin_id)
    except Admin.DoesNotExist:
        raise ValidationError({"error": "Admin not found."})

    serializer = AdminSerializer(admin, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        serializer.save()
        return serializer.data
    raise ValidationError(serializer.errors)

def delete_admin(admin_id):
    try:
        admin = Admin.objects.get(id=admin_id)
        admin.delete()
        return {"message": "Admin deleted successfully"}
    except Admin.DoesNotExist:
        raise ValidationError({"error": "Admin not found."})
    except Exception as e:
        raise ValidationError(f"Error deleting admin: {str(e)}")