from rest_framework import serializers
from .models import BlogPost

class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = [
            'id',
            'title',
            'content',
            'author',
            'created_at',
            'updated_at',
            'status',
            'tags',
            'category',
            'slug',
            'featured_image',
            'summary',
            'published_at',
            'views',
            'allow_comments',
            'is_featured'
        ]
        read_only_fields = [
            'id',
            'created_at',
        ]