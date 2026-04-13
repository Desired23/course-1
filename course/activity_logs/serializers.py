from .models import ActivityLog
from rest_framework import serializers

class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = [
            'user_id', 'action', 'description', 'entity_type', 'entity_id',
            'ip_address', 'created_at', 'user_agent'
        ]
        read_only_fields = ('id', 'created_at')



    