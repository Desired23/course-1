from decimal import Decimal
from rest_framework import serializers
from .models import InstructorEarning


class InstructorEarningSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.user.full_name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    payment_transaction_id = serializers.CharField(source='payment.transaction_id', read_only=True)
    plan_name = serializers.CharField(source='user_subscription.plan.name', read_only=True)
    earning_source = serializers.SerializerMethodField()

    class Meta:
        model = InstructorEarning
        fields = [
            'id',
            'instructor',
            'instructor_name',
            'course',
            'course_title',
            'payment',
            'payment_transaction_id',
            'user_subscription',
            'plan_name',
            'earning_source',
            'amount',
            'net_amount',
            'status',
            'earning_date',
            'instructor_payout',
        ]
        read_only_fields = ['id', 'earning_date', 'net_amount', 'earning_source']

    def get_earning_source(self, obj):
        if obj.user_subscription_id:
            return 'subscription'
        return 'retail'


class SubscriptionRevenueBreakdownSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    records_count = serializers.IntegerField()
    total_minutes = serializers.SerializerMethodField()
    share_pct = serializers.SerializerMethodField()

    def get_total_minutes(self, obj):
        earnings = obj.get('earnings') or Decimal('0')
        return int(round(float(earnings) * 100))

    def get_share_pct(self, obj):
        total_earnings = self.context.get('total_earnings') or Decimal('0')
        earnings = obj.get('earnings') or Decimal('0')
        if not total_earnings:
            return '0.0000'
        share = (Decimal(earnings) / Decimal(total_earnings)) * Decimal('100')
        return f"{share.quantize(Decimal('0.0001'))}"
