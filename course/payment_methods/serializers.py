from rest_framework import serializers
from .models import UserPaymentMethod, InstructorPayoutMethod


class UserPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPaymentMethod
        fields = [
            'id', 'method_type', 'is_default', 'nickname',
            'masked_account', 'bank_name', 'bank_branch',
            'account_number', 'account_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class UserPaymentMethodCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPaymentMethod
        fields = [
            'method_type', 'is_default', 'nickname',
            'gateway_token', 'masked_account',
            'bank_name', 'bank_branch', 'account_number', 'account_name',
        ]

    def validate_method_type(self, value):
        allowed = [c[0] for c in UserPaymentMethod.MethodType.choices]
        if value not in allowed:
            raise serializers.ValidationError(f"method_type must be one of: {allowed}")
        return value


class InstructorPayoutMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorPayoutMethod
        fields = [
            'id', 'method_type', 'is_default', 'nickname',
            'bank_name', 'bank_branch', 'account_number', 'account_name',
            'wallet_phone', 'masked_account', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class InstructorPayoutMethodCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorPayoutMethod
        fields = [
            'method_type', 'is_default', 'nickname',
            'bank_name', 'bank_branch', 'account_number', 'account_name',
            'wallet_phone', 'masked_account',
        ]

    def validate_method_type(self, value):
        allowed = [c[0] for c in InstructorPayoutMethod.MethodType.choices]
        if value not in allowed:
            raise serializers.ValidationError(f"method_type must be one of: {allowed}")
        return value

    def validate(self, attrs):
        method_type = attrs.get('method_type')
        if method_type == InstructorPayoutMethod.MethodType.BANK_TRANSFER:
            if not attrs.get('bank_name') or not attrs.get('account_number') or not attrs.get('account_name'):
                raise serializers.ValidationError(
                    "bank_transfer requires: bank_name, account_number, account_name"
                )
        elif method_type in (InstructorPayoutMethod.MethodType.MOMO, InstructorPayoutMethod.MethodType.VNPAY):
            if not attrs.get('wallet_phone'):
                raise serializers.ValidationError(
                    f"{method_type} requires wallet_phone"
                )
        return attrs
