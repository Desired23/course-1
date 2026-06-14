from decimal import Decimal

from rest_framework import serializers

from .models import PlatformSetting


class PlatformConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = [
            'site_name',
            'site_logo',
            'social_links',
            'contact_email',
            'min_payout',
            'auto_approve_payout',
            'auto_approve_instructor_application',
        ]

    def validate_social_links(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("social_links must be an object of platform -> url.")
        for platform, url in value.items():
            if not isinstance(url, str):
                raise serializers.ValidationError(f"Link for '{platform}' must be a string.")
        return value

    def validate_min_payout(self, value):
        if value is None or value < Decimal('0'):
            raise serializers.ValidationError("min_payout must be zero or greater.")
        return value


POLICY_KEYS = ('terms', 'privacy', 'refund', 'community')


class PolicyDocumentsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = ['legal_policies']

    def validate_legal_policies(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("legal_policies must be an object.")
        cleaned = {}
        for key in POLICY_KEYS:
            content = value.get(key, '')
            if not isinstance(content, str):
                raise serializers.ValidationError(f"Policy '{key}' must be an HTML string.")
            cleaned[key] = content
        return cleaned
