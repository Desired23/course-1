from decimal import Decimal
from rest_framework import serializers
from .models import InstructorEarning


class InstructorEarningSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.user.full_name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    payment_transaction_id = serializers.CharField(source='payment.transaction_id', read_only=True)
    plan_name = serializers.CharField(source='user_subscription.plan.name', read_only=True)
    earning_source = serializers.SerializerMethodField()
    commission_rate_applied = serializers.SerializerMethodField()
    active_hold = serializers.SerializerMethodField()

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
            'commission_rate_applied',
            'platform_commission_rate',
            'instructor_share_rate',
            'instructor_level_id_snapshot',
            'instructor_level_name_snapshot',
            'usage_share_rate',
            'usage_seconds',
            'earning_period_start',
            'earning_period_end',
            'amount',
            'net_amount',
            'status',
            'active_hold',
            'earning_date',
            'instructor_payout',
        ]
        read_only_fields = [
            'id', 'earning_date', 'net_amount', 'earning_source', 'commission_rate_applied',
            'platform_commission_rate', 'instructor_share_rate',
            'instructor_level_id_snapshot', 'instructor_level_name_snapshot',
            'usage_share_rate', 'usage_seconds', 'earning_period_start', 'earning_period_end',
        ]

    def get_earning_source(self, obj):
        if obj.user_subscription_id:
            return 'subscription'
        return 'retail'

    def get_commission_rate_applied(self, obj):
        if obj.platform_commission_rate is not None:
            return str(obj.platform_commission_rate)
        # Fallback only for retail legacy earnings
        if obj.payment_id and obj.amount:
            amount = Decimal(str(obj.amount))
            if amount:
                commission = (amount - Decimal(str(obj.net_amount or 0))) / amount * Decimal('100')
                return str(commission.quantize(Decimal('0.01')))
        return None

    def get_active_hold(self, obj):
        hold = None
        prefetched = getattr(obj, '_prefetched_objects_cache', {}).get('copyright_holds')
        if prefetched is not None:
            hold = next((item for item in prefetched if item.status == 'active'), None)
        if hold is None:
            hold = obj.copyright_holds.filter(status='active').select_related('case').first()
        if not hold:
            return None
        return {
            'hold_id': hold.id,
            'case_id': hold.case_id,
            'reason': hold.reason,
            'created_at': hold.created_at,
        }


class SubscriptionRevenueBreakdownSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    records_count = serializers.IntegerField()
    total_minutes = serializers.SerializerMethodField()
    share_pct = serializers.SerializerMethodField()

    def get_total_minutes(self, obj):
        usage_seconds = obj.get('total_usage_seconds') or 0
        return int(round(usage_seconds / 60))

    def get_share_pct(self, obj):
        total_usage_seconds = self.context.get('total_usage_seconds') or 0
        usage_seconds = obj.get('total_usage_seconds') or 0
        if not total_usage_seconds:
            return '0.0000'
        share = (Decimal(usage_seconds) / Decimal(total_usage_seconds)) * Decimal('100')
        return f"{share.quantize(Decimal('0.0001'))}"
