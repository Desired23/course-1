from rest_framework.exceptions import ValidationError
from .models import SystemsSetting
from .serializers import SystemsSettingSerializer

def _normalize_setting_payload(data, *, is_create=False):
    payload = dict(data or {})


    if 'key' in payload and 'setting_key' not in payload:
        payload['setting_key'] = payload.get('key')
    if 'value' in payload and 'setting_value' not in payload:
        payload['setting_value'] = payload.get('value')
    if 'group' in payload and 'setting_group' not in payload:
        payload['setting_group'] = payload.get('group')

    if is_create:

        payload.setdefault('setting_group', 'general')
        payload.setdefault('description', payload.get('setting_key') or 'System setting')

    return payload

def create_systems_setting(data):
    try:
        payload = _normalize_setting_payload(data, is_create=True)
        serializer = SystemsSettingSerializer(data=payload)
        if serializer.is_valid(raise_exception=True):
            systems_setting = serializer.save()
            return SystemsSettingSerializer(systems_setting).data
        raise ValidationError(serializer.errors)
    except ValidationError:
        raise
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
        payload = _normalize_setting_payload(data, is_create=False)
        serializer = SystemsSettingSerializer(systems_setting, data=payload, partial=True)
        if serializer.is_valid(raise_exception=True):
            updated_systems_setting = serializer.save()
            return SystemsSettingSerializer(updated_systems_setting).data
        raise ValidationError(serializer.errors)
    except SystemsSetting.DoesNotExist:
        raise ValidationError({"error": "Systems setting not found."})
    except ValidationError:
        raise
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
