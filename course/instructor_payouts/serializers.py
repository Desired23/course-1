from rest_framework import serializers
from .models import InstructorPayout

class InstructorPayoutSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.user.full_name', read_only=True)
    instructor_email = serializers.EmailField(source='instructor.user.email', read_only=True)

    class Meta:
        model = InstructorPayout
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

