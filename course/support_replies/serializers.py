from rest_framework import serializers
from .models import SupportReply
class SupportReplySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportReply
        fields = ['id', 'support', 'user', 'admin', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']  # id and created_at should not be editable by users