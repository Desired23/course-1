import json
from decimal import Decimal, InvalidOperation
from rest_framework.exceptions import ValidationError
from .models import PaymentSetting, PlatformSetting
from utils.admin_actors import resolve_admin_actor

CORE_SETTING_ID_BASE = 1_000_000_000

CORE_SETTINGS = {
    'site_name': {
        'id': CORE_SETTING_ID_BASE + 1,
        'model': 'platform',
        'field': 'site_name',
        'group': 'general',
        'description': 'Site display name',
        'type': 'text',
    },
    'site_logo': {
        'id': CORE_SETTING_ID_BASE + 2,
        'model': 'platform',
        'field': 'site_logo',
        'group': 'general',
        'description': 'Site logo URL',
        'type': 'text',
    },
    'site_description': {
        'id': CORE_SETTING_ID_BASE + 10,
        'model': 'platform',
        'field': 'site_description',
        'group': 'general',
        'description': 'Site description',
        'type': 'text',
    },
    'favicon': {
        'id': CORE_SETTING_ID_BASE + 11,
        'model': 'platform',
        'field': 'favicon',
        'group': 'general',
        'description': 'Site favicon URL',
        'type': 'text',
    },
    'primary_color': {
        'id': CORE_SETTING_ID_BASE + 12,
        'model': 'platform',
        'field': 'primary_color',
        'group': 'general',
        'description': 'Primary brand color',
        'type': 'text',
    },
    'secondary_color': {
        'id': CORE_SETTING_ID_BASE + 13,
        'model': 'platform',
        'field': 'secondary_color',
        'group': 'general',
        'description': 'Secondary brand color',
        'type': 'text',
    },
    'contact_email': {
        'id': CORE_SETTING_ID_BASE + 14,
        'model': 'platform',
        'field': 'contact_email',
        'group': 'general',
        'description': 'Support contact email',
        'type': 'text',
    },
    'contact_phone': {
        'id': CORE_SETTING_ID_BASE + 15,
        'model': 'platform',
        'field': 'contact_phone',
        'group': 'general',
        'description': 'Support contact phone',
        'type': 'text',
    },
    'contact_address': {
        'id': CORE_SETTING_ID_BASE + 16,
        'model': 'platform',
        'field': 'contact_address',
        'group': 'general',
        'description': 'Support contact address',
        'type': 'text',
    },
    'social_links': {
        'id': CORE_SETTING_ID_BASE + 17,
        'model': 'platform',
        'field': 'social_links',
        'group': 'general',
        'description': 'Public social links',
        'type': 'json',
    },
    'banners': {
        'id': CORE_SETTING_ID_BASE + 18,
        'model': 'platform',
        'field': 'banners',
        'group': 'homepage',
        'description': 'Website banners',
        'type': 'json',
    },
    'min_payout': {
        'id': CORE_SETTING_ID_BASE + 3,
        'model': 'platform',
        'field': 'min_payout',
        'group': 'payment',
        'description': 'Minimum instructor payout amount',
        'type': 'decimal',
    },
    'auto_approve_payout': {
        'id': CORE_SETTING_ID_BASE + 5,
        'model': 'platform',
        'field': 'auto_approve_payout',
        'group': 'payment',
        'description': 'Auto approve payout requests',
        'type': 'bool',
    },
    'auto_approve_instructor_application': {
        'id': CORE_SETTING_ID_BASE + 9,
        'model': 'platform',
        'field': 'auto_approve_instructor_application',
        'group': 'instructor',
        'description': 'Auto approve instructor applications',
        'type': 'bool',
    },
    'homepage_layout': {
        'id': CORE_SETTING_ID_BASE + 7,
        'model': 'platform',
        'field': 'homepage_layout',
        'group': 'homepage',
        'description': 'Default homepage layout components',
        'type': 'json',
    },
    'homepage_config': {
        'id': CORE_SETTING_ID_BASE + 8,
        'model': 'platform',
        'field': 'homepage_config',
        'group': 'homepage',
        'description': 'Default homepage content configuration',
        'type': 'json',
    },
    'homepage_schema_v2': {
        'id': CORE_SETTING_ID_BASE + 19,
        'model': 'platform',
        'field': 'homepage_schema_v2',
        'group': 'homepage',
        'description': 'Dynamic homepage schema v2',
        'type': 'json',
        'nullable_json': True,
    },
    'homepage_schema_v2_initial_backup': {
        'id': CORE_SETTING_ID_BASE + 20,
        'model': 'platform',
        'field': 'homepage_schema_v2_initial_backup',
        'group': 'homepage',
        'description': 'Initial homepage schema backup',
        'type': 'json',
        'nullable_json': True,
    },
    'website_management': {
        'id': CORE_SETTING_ID_BASE + 22,
        'model': 'platform',
        'field': 'website_management',
        'group': 'website',
        'description': 'Website management configuration',
        'type': 'json',
    },
    'learning_path_gemini_model': {
        'id': CORE_SETTING_ID_BASE + 23,
        'model': 'platform',
        'field': 'learning_path_gemini_model',
        'group': 'ai',
        'description': 'Learning path Gemini model override',
        'type': 'text',
    },
    'payment_policies': {
        'id': CORE_SETTING_ID_BASE + 101,
        'model': 'payment',
        'field': 'payment_policies',
        'group': 'payments',
        'description': 'Payment management policies configuration',
        'type': 'json',
    },
    'instructor_rates': {
        'id': CORE_SETTING_ID_BASE + 102,
        'model': 'payment',
        'field': 'instructor_rates',
        'group': 'payments',
        'description': 'Payment management instructor rates configuration',
        'type': 'json',
    },
    'discount_rules': {
        'id': CORE_SETTING_ID_BASE + 103,
        'model': 'payment',
        'field': 'discount_rules',
        'group': 'payments',
        'description': 'Payment management discount rules configuration',
        'type': 'json',
    },
    'payment_methods_config': {
        'id': CORE_SETTING_ID_BASE + 105,
        'model': 'payment',
        'field': 'payment_methods_config',
        'group': 'payments',
        'description': 'Payment methods configuration',
        'type': 'json',
    },
    'payment_settings_config': {
        'id': CORE_SETTING_ID_BASE + 106,
        'model': 'payment',
        'field': 'payment_settings_config',
        'group': 'payments',
        'description': 'Payment settings configuration',
        'type': 'json',
    },
    'payment_gateways': {
        'id': CORE_SETTING_ID_BASE + 107,
        'model': 'payment',
        'field': 'payment_gateways',
        'group': 'payments',
        'description': 'Payment gateway configuration',
        'type': 'json',
    },
}

CORE_SETTING_KEYS = frozenset(CORE_SETTINGS)
CORE_SETTING_IDS = {meta['id']: key for key, meta in CORE_SETTINGS.items()}


def get_platform_setting():
    platform_setting, _ = PlatformSetting.objects.get_or_create(singleton_key=1)
    return platform_setting


def get_payment_setting():
    payment_setting, _ = PaymentSetting.objects.get_or_create(singleton_key=1)
    return payment_setting


def _setting_instance_for_meta(meta, *, platform_setting=None, payment_setting=None):
    if meta.get('model') == 'payment':
        return payment_setting or get_payment_setting()
    return platform_setting or get_platform_setting()


def is_core_setting_key(setting_key):
    return setting_key in CORE_SETTINGS


def is_core_setting_id(setting_id):
    return int(setting_id) in CORE_SETTING_IDS


def _bool_from_value(value):
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


def _serialize_core_value(value, value_type):
    if value_type == 'bool':
        return 'true' if value else 'false'
    if value_type == 'json':
        if value is None:
            return ''
        return json.dumps(value, ensure_ascii=False)
    return str(value if value is not None else '')


def _coerce_core_value(raw_value, value_type):
    if value_type == 'bool':
        return _bool_from_value(raw_value)
    if value_type == 'decimal':
        try:
            return Decimal(str(raw_value).strip())
        except (InvalidOperation, ValueError, TypeError):
            raise ValidationError({"value": "Invalid decimal value."})
    if value_type == 'json':
        if isinstance(raw_value, (dict, list)):
            return raw_value
        if raw_value in (None, ''):
            return None
        try:
            return json.loads(raw_value)
        except (TypeError, json.JSONDecodeError):
            raise ValidationError({"value": "Invalid JSON value."})
    return '' if raw_value is None else str(raw_value)


def _core_payload(setting_key, platform_setting=None, payment_setting=None):
    meta = CORE_SETTINGS[setting_key]
    setting_instance = _setting_instance_for_meta(
        meta,
        platform_setting=platform_setting,
        payment_setting=payment_setting,
    )
    raw_value = getattr(setting_instance, meta['field'])
    value = _serialize_core_value(raw_value, meta['type'])
    return {
        'id': meta['id'],
        'setting_group': meta['group'],
        'setting_key': setting_key,
        'setting_value': value,
        'group': meta['group'],
        'key': setting_key,
        'value': value,
        'description': meta['description'],
        'admin': setting_instance.updated_by_id,
        'created_at': setting_instance.created_at,
        'updated_at': setting_instance.updated_at,
    }


def _raw_value_from_payload(payload):
    if 'setting_value' in payload:
        return payload.get('setting_value')
    return payload.get('value')


def update_core_setting(setting_key, data, admin_actor=None):
    if setting_key not in CORE_SETTINGS:
        raise ValidationError({"error": "Core setting not found."})
    payload = _normalize_setting_payload(data, is_create=False)
    if 'setting_value' not in payload:
        raise ValidationError({"value": "This field is required."})

    meta = CORE_SETTINGS[setting_key]
    setting_instance = _setting_instance_for_meta(meta)
    setattr(
        setting_instance,
        meta['field'],
        _coerce_core_value(_raw_value_from_payload(payload), meta['type']),
    )
    setting_instance.updated_by = resolve_admin_actor(admin_actor) if admin_actor is not None else None
    setting_instance.save(update_fields=[meta['field'], 'updated_by', 'updated_at'])
    return _core_payload(setting_key, setting_instance if meta.get('model') != 'payment' else None, setting_instance if meta.get('model') == 'payment' else None)


def get_text_setting(setting_key, default=''):
    if setting_key in CORE_SETTINGS:
        payload = _core_payload(setting_key)
        value = str(payload['value']).strip()
        return value if value else default
    return default

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

def create_systems_setting(data, admin_actor=None):
    try:
        payload = _normalize_setting_payload(data, is_create=True)
        setting_key = payload.get('setting_key')
        if setting_key in CORE_SETTINGS:
            return update_core_setting(setting_key, payload, admin_actor=admin_actor)

        raise ValidationError({"error": "Unsupported typed setting key."})
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_bool_setting(setting_key, default=False):
    if setting_key in CORE_SETTINGS and CORE_SETTINGS[setting_key]['type'] == 'bool':
        meta = CORE_SETTINGS[setting_key]
        setting_instance = _setting_instance_for_meta(meta)
        return bool(getattr(setting_instance, meta['field']))

    return default

def get_decimal_setting(setting_key, default=Decimal('0')):
    if setting_key in CORE_SETTINGS and CORE_SETTINGS[setting_key]['type'] == 'decimal':
        meta = CORE_SETTINGS[setting_key]
        setting_instance = _setting_instance_for_meta(meta)
        return Decimal(str(getattr(setting_instance, meta['field'])))

    return Decimal(str(default))

def get_systems_setting_by_key(setting_key):
    try:
        if setting_key in CORE_SETTINGS:
            return _core_payload(setting_key)

        raise ValidationError({"error": "Systems setting not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_systems_settings():
    return list_systems_settings_payload()

def get_systems_setting_by_admin_id(admin_id):
    return list_systems_settings_payload(admin_id=admin_id)

def update_systems_setting(setting_id, data, admin_actor=None):
    try:
        setting_id = int(setting_id)
        if setting_id in CORE_SETTING_IDS:
            return update_core_setting(CORE_SETTING_IDS[setting_id], data, admin_actor=admin_actor)

        raise ValidationError({"error": "Systems setting not found."})
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": str(e)})

def delete_systems_setting(setting_id):
    try:
        setting_id = int(setting_id)
        if setting_id in CORE_SETTING_IDS:
            raise ValidationError({"error": "Core platform settings cannot be deleted."})

        raise ValidationError({"error": "Systems setting not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})


def list_systems_settings_payload(admin_id=None):
    platform_setting = get_platform_setting()
    payment_setting = get_payment_setting()
    payload = []
    for key in CORE_SETTINGS:
        row = _core_payload(key, platform_setting=platform_setting, payment_setting=payment_setting)
        if admin_id is None or str(row.get('admin')) == str(admin_id):
            payload.append(row)
    return payload


def get_public_home_settings_payload():
    platform_setting = get_platform_setting()
    payload = {
        'homepage_layout': _serialize_core_value(platform_setting.homepage_layout, 'json'),
        'homepage_config': _serialize_core_value(platform_setting.homepage_config, 'json'),
    }
    if platform_setting.homepage_schema_v2:
        payload['homepage_schema_v2'] = _serialize_core_value(platform_setting.homepage_schema_v2, 'json')
    return payload


def get_public_branding_payload():
    platform_setting = get_platform_setting()
    return {
        'site_name': platform_setting.site_name,
        'site_logo': platform_setting.site_logo,
        'site_description': platform_setting.site_description,
        'favicon': platform_setting.favicon,
        'primary_color': platform_setting.primary_color,
        'secondary_color': platform_setting.secondary_color,
        'social_links': platform_setting.social_links or {},
    }
