from rest_framework import serializers
from django.db.models import Sum
from .models import Promotion

class PromotionSerializer(serializers.ModelSerializer):
    revenue_impact = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = [
            'id',
            'code',
            'description',
            'discount_type',
            'discount_value',
            'start_date',
            'end_date',
            'usage_limit',
            'used_count',
            'min_purchase',
            'max_discount',
            'applicable_courses',
            'applicable_categories',
            'admin',
            'instructor',
            'show_on_homepage',
            'status',
            'revenue_impact',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at'
        ]

    def get_revenue_impact(self, obj):
        from decimal import Decimal
        from payment_details.models import Payment_Details
        from payments.models import Payment

        detail_total = Payment_Details.objects.filter(
            promotion=obj,
            is_deleted=False,
            payment__is_deleted=False,
            payment__payment_status=Payment.PaymentStatus.COMPLETED,
        ).aggregate(total=Sum('discount'))['total'] or Decimal('0.00')

        payment_total = Decimal('0.00')
        payments = Payment.objects.filter(
            promotion=obj,
            is_deleted=False,
            payment_status=Payment.PaymentStatus.COMPLETED,
        ).prefetch_related('payment_details')
        for payment in payments:
            detail_discount_total = sum(
                (
                    detail.discount
                    for detail in payment.payment_details.all()
                    if not detail.is_deleted
                ),
                Decimal('0.00'),
            )
            payment_discount = payment.discount_amount - detail_discount_total
            if payment_discount > 0:
                payment_total += payment_discount

        return str((detail_total + payment_total).quantize(Decimal('0.01')))
