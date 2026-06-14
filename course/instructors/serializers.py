from rest_framework import serializers
from .models import Instructor
from users.models import User
from users.serializers import Userserializers
from instructor_levels.serializers import InstructorLevelSerializer

class InstructorSerializers(serializers.ModelSerializer):

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True, required=False
    )
    user = Userserializers(read_only=True)
    level = InstructorLevelSerializer(read_only=True)

    class Meta:
        model = Instructor
        fields = [
            'id',
            'user',
            'user_id',
            'bio',
            'specialization',
            'qualification',
            'experience',
            'social_links',
            'rating',
            'total_students',
            'total_courses',
            'payment_info',
            'profile_settings',
            'level',
        ]
        extra_kwargs = {
            'total_students': {'read_only': True},
            'total_courses': {'read_only': True},
        }
