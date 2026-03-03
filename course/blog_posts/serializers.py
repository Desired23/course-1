from rest_framework import serializers
from .models import BlogPost

class BlogPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id',
            'title',
            'content',
            'author',
            'author_name',
            'author_avatar',
            'created_at',
            'updated_at',
            'status',
            'tags',
            'category',
            'category_name',
            'slug',
            'featured_image',
            'summary',
            'published_at',
            'views',
            'likes',
            'allow_comments',
            'is_featured',
            'comments_count',
        ]
        read_only_fields = [
            'id',
            'created_at',
        ]

    def get_author_name(self, obj):
        return obj.author.full_name if obj.author else None

    def get_author_avatar(self, obj):
        return obj.author.avatar if obj.author else None

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_comments_count(self, obj):
        return obj.comments_blog_post.filter(status='active').count()