from decimal import Decimal, ROUND_HALF_UP
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
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    payment_date = serializers.SerializerMethodField()
    refund_status = serializers.SerializerMethodField()
    refund_amount = serializers.SerializerMethodField()
    refund_date = serializers.SerializerMethodField()
    refund_reason = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()
    platform_discount_amount = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    platform_fee_amount = serializers.SerializerMethodField()
    instructor_refund_amount = serializers.SerializerMethodField()
    instructor_net_after_refund = serializers.SerializerMethodField()

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
            'student_name',
            'student_email',
            'payment_date',
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
            'sale_price',
            'platform_discount_amount',
            'paid_amount',
            'platform_fee_amount',
            'instructor_refund_amount',
            'instructor_net_after_refund',
            'status',
            'refund_status',
            'refund_amount',
            'refund_date',
            'refund_reason',
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

    def _student(self, obj):
        if obj.payment_id and obj.payment and obj.payment.user_id:
            return obj.payment.user
        if obj.user_subscription_id and obj.user_subscription and obj.user_subscription.user_id:
            return obj.user_subscription.user
        return None

    def _payment_date(self, obj):
        if obj.payment_id and obj.payment:
            return obj.payment.payment_date
        if obj.user_subscription_id and obj.user_subscription and obj.user_subscription.payment:
            return obj.user_subscription.payment.payment_date
        return obj.earning_date

    def _payment_detail(self, obj):
        if not obj.payment_id or not obj.payment or not obj.course_id:
            return None
        details = getattr(obj.payment, 'payment_details', None)
        if details is not None:
            try:
                iterable = details.all()
            except TypeError:
                iterable = details
            detail = next((item for item in iterable if item.course_id == obj.course_id and not item.is_deleted), None)
        else:
            detail = None
        if detail is None:
            detail = obj.payment.payment_details.filter(course_id=obj.course_id, is_deleted=False).first()
        return detail

    def _payment_details_iterable(self, obj):
        if not obj.payment_id or not obj.payment:
            return []
        details = getattr(obj.payment, 'payment_details', None)
        if details is None:
            return obj.payment.payment_details.filter(is_deleted=False)
        try:
            iterable = details.all()
        except TypeError:
            iterable = details
        return [item for item in iterable if not item.is_deleted]

    def _money(self, value):
        return Decimal(str(value or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def _line_paid_amount(self, obj):
        detail = self._payment_detail(obj)
        if not detail:
            return self._money(obj.amount)

        line_final = Decimal(str(detail.final_price or 0))
        payment = obj.payment
        if not payment or payment.total_amount is None:
            return self._money(line_final)

        details_total = sum(
            (Decimal(str(item.final_price or 0)) for item in self._payment_details_iterable(obj)),
            Decimal('0.00'),
        )
        if details_total <= 0:
            return self._money(line_final)

        paid = line_final / details_total * Decimal(str(payment.total_amount or 0))
        return self._money(paid)

    def _line_discount_amount(self, obj):
        detail = self._payment_detail(obj)
        if not detail:
            return Decimal('0.00')
        return self._money(max(Decimal(str(detail.price or 0)) - self._line_paid_amount(obj), Decimal('0.00')))

    def _instructor_gross_amount(self, obj):
        if not obj.payment_id:
            return self._money(obj.net_amount)
        share_rate = obj.instructor_share_rate
        if share_rate is None and obj.amount:
            amount = Decimal(str(obj.amount))
            share_rate = (Decimal(str(obj.net_amount or 0)) / amount * Decimal('100')) if amount else Decimal('0')
        share_rate = Decimal(str(share_rate or 0))
        return self._money(self._line_paid_amount(obj) * share_rate / Decimal('100'))

    def _refund_detail(self, obj):
        detail = self._payment_detail(obj)
        if not detail:
            return None
        has_refund = detail.refund_request_time or detail.refund_date or detail.refund_amount
        if not has_refund and detail.refund_status == 'pending':
            return None
        return detail

    def _instructor_refund_amount(self, obj):
        detail = self._refund_detail(obj)
        if not detail:
            return Decimal('0.00')
        from payment_details.models import Payment_Details
        if detail.refund_status in {
            Payment_Details.RefundStatus.REJECTED,
            Payment_Details.RefundStatus.FAILED,
            Payment_Details.RefundStatus.CANCELLED,
        }:
            return Decimal('0.00')
        refund_amount = min(Decimal(str(detail.refund_amount or 0)), self._line_paid_amount(obj))
        if refund_amount <= 0 and detail.refund_status in {
            Payment_Details.RefundStatus.PENDING,
            Payment_Details.RefundStatus.APPROVED,
            Payment_Details.RefundStatus.PROCESSING,
            Payment_Details.RefundStatus.SUCCESS,
        }:
            refund_amount = self._line_paid_amount(obj)
        share_rate = obj.instructor_share_rate
        if share_rate is None and obj.amount:
            amount = Decimal(str(obj.amount))
            share_rate = (Decimal(str(obj.net_amount or 0)) / amount * Decimal('100')) if amount else Decimal('0')
        share_rate = Decimal(str(share_rate or 0))
        return min(
            self._money(refund_amount * share_rate / Decimal('100')),
            self._instructor_gross_amount(obj),
        )

    def get_student_name(self, obj):
        student = self._student(obj)
        return student.full_name if student else None

    def get_student_email(self, obj):
        student = self._student(obj)
        return student.email if student else None

    def get_payment_date(self, obj):
        value = self._payment_date(obj)
        return value.isoformat() if value else None

    def get_refund_status(self, obj):
        detail = self._refund_detail(obj)
        return detail.refund_status if detail else None

    def get_refund_amount(self, obj):
        detail = self._refund_detail(obj)
        if not detail:
            return None
        return str(self._money(detail.refund_amount or self._line_paid_amount(obj)))

    def get_refund_date(self, obj):
        detail = self._refund_detail(obj)
        value = detail.refund_date or detail.refund_request_time if detail else None
        return value.isoformat() if value else None

    def get_refund_reason(self, obj):
        detail = self._refund_detail(obj)
        return detail.refund_reason if detail else None

    def get_sale_price(self, obj):
        detail = self._payment_detail(obj)
        return str(detail.price) if detail else None

    def get_platform_discount_amount(self, obj):
        detail = self._payment_detail(obj)
        return str(self._line_discount_amount(obj)) if detail else None

    def get_paid_amount(self, obj):
        return str(self._line_paid_amount(obj))

    def get_platform_fee_amount(self, obj):
        amount = self._line_paid_amount(obj)
        net_amount = self._instructor_gross_amount(obj)
        return str(max(amount - net_amount, Decimal('0.00')).quantize(Decimal('0.01')))

    def get_instructor_refund_amount(self, obj):
        return str(self._instructor_refund_amount(obj))

    def get_instructor_net_after_refund(self, obj):
        net_amount = self._instructor_gross_amount(obj)
        remaining = max(net_amount - self._instructor_refund_amount(obj), Decimal('0.00'))
        return str(remaining.quantize(Decimal('0.01')))


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
