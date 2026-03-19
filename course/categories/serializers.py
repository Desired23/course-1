from rest_framework import serializers
from .models import Category

class CategoriesSerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'description',
            'icon',
            'parent_category',
            'status',
            'created_at',
            'updated_at',
            'course_count',
        ]
        extra_kwargs = {
            "name": {
                "required": True,
                "error_messages": {
                    "blank": "Name cannot be blank",
                    "null": "Name cannot be null",
                    "required": "Name is required",
                },
            },
            "description": {
                "required": False,
                "error_messages": {
                    "blank": "Description cannot be blank",
                    "null": "Description cannot be null",
                },
            },
            "icon": {
                "required": False,
                "allow_blank": True,
                "allow_null": True,
            },
        }
