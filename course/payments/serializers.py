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
            'payment_method',
            'payment_date',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
