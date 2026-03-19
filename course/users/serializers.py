from rest_framework import serializers
from .models import User, UserSettings
from .preferences import (
    DEFAULT_ACCOUNT_PREFERENCES,
    DEFAULT_NOTIFICATION_PREFERENCES,
    DEFAULT_PRIVACY_PREFERENCES,
    KNOWN_CURRENCIES,
    KNOWN_LANGUAGES,
    KNOWN_TIMEZONES,
)

class Userserializers(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'password_hash',
            'full_name',
            'phone',
            'avatar',
            'address',
            'created_at',
            'last_login',
            'status',
            'user_type'
        ]
        extra_kwargs = {
            'password_hash': {'write_only': True},
            'email': {'required': True,},
            'username': {'required': True},
            'full_name': {'required': True},
        }
class UserUpdateBySelfSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'password_hash',
            'full_name',
            'phone',
            'avatar',
            'address',
            'created_at',
            'last_login',
            'status',
            'user_type'
        ]
        extra_kwargs = {
            'password_hash': {'write_only': True},
        }
        read_only_fields = ['id', 'created_at', 'last_login', 'status', 'user_type']


class UserSettingsSerializer(serializers.ModelSerializer):
    def validate_account_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("account_preferences must be an object.")
        merged = dict(DEFAULT_ACCOUNT_PREFERENCES)
        merged.update({k: v for k, v in value.items() if k in DEFAULT_ACCOUNT_PREFERENCES})

        if merged.get("language") not in KNOWN_LANGUAGES:
            raise serializers.ValidationError({"language": f"Unsupported language. Allowed: {sorted(KNOWN_LANGUAGES)}"})
        if merged.get("timezone") not in KNOWN_TIMEZONES:
            raise serializers.ValidationError({"timezone": f"Unsupported timezone. Allowed: {sorted(KNOWN_TIMEZONES)}"})
        if merged.get("currency") not in KNOWN_CURRENCIES:
            raise serializers.ValidationError({"currency": f"Unsupported currency. Allowed: {sorted(KNOWN_CURRENCIES)}"})
        return merged

    def validate_notification_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("notification_preferences must be an object.")
        merged = dict(DEFAULT_NOTIFICATION_PREFERENCES)
        for key in DEFAULT_NOTIFICATION_PREFERENCES.keys():
            if key in value:
                merged[key] = bool(value.get(key))
        return merged

    def validate_privacy_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("privacy_preferences must be an object.")
        merged = dict(DEFAULT_PRIVACY_PREFERENCES)
        for key in DEFAULT_PRIVACY_PREFERENCES.keys():
            if key in value:
                merged[key] = bool(value.get(key))
        return merged

    class Meta:
        model = UserSettings
        fields = [
            'account_preferences',
            'notification_preferences',
            'privacy_preferences',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['account_preferences'] = {
            **DEFAULT_ACCOUNT_PREFERENCES,
            **(data.get('account_preferences') or {}),
        }
        data['notification_preferences'] = {
            **DEFAULT_NOTIFICATION_PREFERENCES,
            **(data.get('notification_preferences') or {}),
        }
        data['privacy_preferences'] = {
            **DEFAULT_PRIVACY_PREFERENCES,
            **(data.get('privacy_preferences') or {}),
        }
        return data
