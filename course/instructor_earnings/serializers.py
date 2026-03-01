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
        """retail = bán lẻ; subscription = revenue sharing từ plan"""
        if obj.user_subscription_id:
            return 'subscription'
        return 'retail'
