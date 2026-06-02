from .models import Admin
from rest_framework import serializers

class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = [
            'id',
            'user',
            'department',
            'role',
            'is_super_admin',
            'permissions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']