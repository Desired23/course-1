from rest_framework import serializers
from .models import Support
class SupportSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True, default=None)

    class Meta:
        model = Support
        fields = [
            'id',
            'user',
            'name',
            'email',
            'subject',
            'message',
            'ticket_type',
            'course',
            'course_title',
            'metadata',
            'resolution',
            'status',
            'priority',
            'created_at',
            'updated_at',
            'admin'
        ]
        read_only_fields = [
            'id',
            'user',
            'admin',
            'resolution',
            'created_at',
            'updated_at'
        ]
