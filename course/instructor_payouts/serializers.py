from rest_framework import serializers
from .models import InstructorPayout

class InstructorPayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorPayout
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

