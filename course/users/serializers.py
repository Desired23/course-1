from rest_framework import serializers
from .models import User

class Userserializers(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'password_hash',
            'full_name',
            'phone',
            'avatar',
            'address',
            'created_at',
            'last_login',
            'status',
            'user_type'
        ]
        extra_kwargs = {
            'password_hash': {'write_only': True},
            'email': {'required': True,},
            'username': {'required': True},
            'full_name': {'required': True},
        }
class UserUpdateBySelfSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'password_hash',
            'full_name',
            'phone',
            'avatar',
            'address',
            'created_at',
            'last_login',
            'status',
            'user_type'
        ]
        extra_kwargs = {
            'password_hash': {'write_only': True},
        }
        read_only_fields = ['id', 'created_at', 'last_login', 'status', 'user_type']