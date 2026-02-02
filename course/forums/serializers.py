from rest_framework import serializers
from .models import Forum

class ForumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Forum
        fields = [
            'id',
            'course',
            'title',
            'description',
            'user_id',
            'created_at',
            'status'
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'created_at': {'read_only': True}
        }