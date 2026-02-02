from rest_framework import serializers
from .models import Instructor
from users.models import User
from users.serializers import Userserializers  # Giả sử bạn đã có serializer cho User

class InstructorSerializers(serializers.ModelSerializer):
    # Thêm explicit field để quy định user_pk khi viết, user object khi đọc
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True, required=False
    )
    user = Userserializers(read_only=True)
    
    class Meta:
        model = Instructor
        fields = [
            'id',
            'user',  # Read-only: trả về full user object
            'user_id',  # Write-only: nhận user PK khi tạo/update
            'bio',
            'specialization',
            'qualification',
            'experience',
            'social_links',
            'rating',
            'total_students',
            'total_courses',
            'payment_info'
        ]
        extra_kwargs = {
            'total_students': {'read_only': True},
            'total_courses': {'read_only': True},
        }