from rest_framework import serializers
from .models import Promotion

class PromotionSerializer(serializers.ModelSerializer):

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
            'status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at'
        ]