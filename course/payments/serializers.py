from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id',
            'user',
            'amount',
            'promotion', 
            'discount_amount',
            'total_amount',
            'transaction_id',
            'payment_date',
            'payment_status',
            'payment_method',
            'refund_amount',
            'payment_gateway',
            'gateway_response',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id',
            'user',
            'amount',
            'promotion', 
            'discount_amount',
            'total_amount',
            'transaction_id',
            'payment_method',
            'payment_date',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentStatusSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField()
    payment_status = serializers.CharField()
    transaction_id = serializers.CharField(allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.CharField()
    courses = serializers.ListField(child=serializers.DictField())
    created_at = serializers.DateTimeField()
    completed_at = serializers.DateTimeField(allow_null=True)


class CheckEnrollmentSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField(allow_null=True)
    payment_status = serializers.CharField(allow_null=True)
    transaction_id = serializers.CharField(allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    course_id = serializers.IntegerField()
    enrollment_status = serializers.CharField(allow_null=True)
    enrollment_id = serializers.IntegerField(allow_null=True)
    created_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
