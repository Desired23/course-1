from rest_framework import serializers
from .models import Course
from instructors.models import Instructor
from categories.models import Category
from instructors.serializers import InstructorSerializers  # giả sử đã có sẵn

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'shortdescription',
            'description',
            'instructor',
            'category',
            'subcategory',
            'thumbnail',
            'price',
            'discount_price',
            'discount_start_date',
            'discount_end_date',
            'level',
            'language',
            'duration',
            'total_lessons',
            'total_modules',
            'requirements',
            'status',
            'is_featured',
            'is_public',
            'created_at',
            'updated_at',
            'published_date',
            'rating',
            'total_reviews',
            'total_students',
            'certificate',
        ]
        read_only_fields = [
            'rating', 'total_reviews', 'total_students'
        ]
        
