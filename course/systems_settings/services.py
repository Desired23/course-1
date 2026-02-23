from rest_framework.exceptions import ValidationError
from .models import SystemsSetting
from .serializers import SystemsSettingSerializer

def create_systems_setting(data):
    try:
        serializer = SystemsSettingSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            systems_setting = serializer.save()
            return SystemsSettingSerializer(systems_setting).data
        raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_systems_setting_by_key(setting_key):
    try:
        systems_setting = SystemsSetting.objects.get(setting_key=setting_key)
        serializer = SystemsSettingSerializer(systems_setting)
        return serializer.data
    except SystemsSetting.DoesNotExist:
        raise ValidationError({"error": "Systems setting not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_systems_settings():
    try:
        systems_settings = SystemsSetting.objects.all()
        return systems_settings
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_systems_setting_by_admin_id(admin_id):
    try:
        systems_settings = SystemsSetting.objects.filter(admin=admin_id)
        return systems_settings
    except Exception as e:
        raise ValidationError({"error": str(e)})

def update_systems_setting(setting_id, data):
    try:
        systems_setting = SystemsSetting.objects.get(id=setting_id)
        serializer = SystemsSettingSerializer(systems_setting, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            updated_systems_setting = serializer.save()
            return SystemsSettingSerializer(updated_systems_setting).data
        raise ValidationError(serializer.errors)
    except SystemsSetting.DoesNotExist:
        raise ValidationError({"error": "Systems setting not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def delete_systems_setting(setting_id):
    try:
        systems_setting = SystemsSetting.objects.get(id=setting_id)
        systems_setting.delete()
        return {"message": "Systems setting deleted successfully."}
    except SystemsSetting.DoesNotExist:
        raise ValidationError({"error": "Systems setting not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})