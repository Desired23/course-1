from rest_framework import serializers
from .models import Wishlist
from courses.models import Course

class WishlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wishlist
        fields = [
            'id',
            'user',
            'course',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'created_at'
        ]
    
    def validate_course(self, value):
        """Validate course exists and is not deleted"""
        if value is None:
            raise serializers.ValidationError("Course is required.")
        if value.is_deleted:
            raise serializers.ValidationError("Course has been deleted.")
        return value