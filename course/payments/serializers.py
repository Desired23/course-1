from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'payment_id',
            'user_id',
            'amount',
            'promotion_id', 
            'discount_amount',
            'total_amount',
            'transaction_id',
            'payment_date',
            'payment_status',
            'payment_method',
            'refund_amount',
            'payment_gateway',
            'gateway_response'
        ]
class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'payment_id',
            'user_id',
            'amount',
            'promotion_id', 
            'discount_amount',
            'total_amount',
            'payment_method',
            'payment_date',
        ]
        read_only_fields = []
