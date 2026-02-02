from rest_framework import serializers
from .models import Support
class SupportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Support
        fields = [
            'id',
            'user',
            'name',
            'email',
            'subject',
            'message',
            'status',
            'priority',
            'created_at',
            'updated_at',
            'admin'
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at'
        ]