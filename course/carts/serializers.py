from rest_framework import serializers
from .models import Cart

class CartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = [
            'id',
            'user',
            'course',
            'promotion',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'created_at'
        ]