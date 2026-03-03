from django.db import models
from decimal import Decimal
from instructors.models import Instructor
from categories.models import Category


class Course(models.Model):
    class Level(models.TextChoices):
        BEGINNER = 'beginner'
        INTERMEDIATE = 'intermediate'
        ADVANCED = 'advanced'
        ALL_LEVELS = 'all_levels'

    class Status(models.TextChoices):
        DRAFT = 'draft'
        PENDING = 'pending'
        PUBLISHED = 'published'
        REJECTED = 'rejected'
        ARCHIVED = 'archived'
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    shortdescription = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    instructor = models.ForeignKey(Instructor, on_delete=models.SET_NULL, related_name='courses_instructor',null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, related_name='category_courses', null=True)
    subcategory = models.ForeignKey(Category, on_delete=models.SET_NULL, related_name='subcategory_courses', null=True)
    thumbnail = models.CharField(max_length=255, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    discount_start_date = models.DateTimeField(blank=True, null=True)
    discount_end_date = models.DateTimeField(blank=True, null=True)
    level = models.CharField(
        max_length=20,
        choices=Level.choices,
        default=Level.ALL_LEVELS
    )
    language = models.CharField(max_length=50, default='Tiếng Việt')
    duration = models.IntegerField(help_text="Thời lượng tính bằng phút", blank=True, null=True)
    total_lessons = models.IntegerField(default=0)
    total_modules = models.IntegerField(default=0)
    requirements = models.TextField(blank=True, null=True)
    learning_objectives = models.JSONField(default=list, blank=True, help_text="Danh sách mục tiêu học tập")
    target_audience = models.JSONField(default=list, blank=True, help_text="Danh sách đối tượng mục tiêu")
    tags = models.JSONField(default=list, blank=True, help_text="Danh sách tags")
    promotional_video = models.CharField(max_length=500, blank=True, null=True, help_text="URL video giới thiệu")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    is_featured = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_courses')
    is_deleted = models.BooleanField(default=False)
    published_date = models.DateTimeField(blank=True, null=True)
    rating = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal('0.00'))
    total_reviews = models.IntegerField(default=0)
    total_students = models.IntegerField(default=0)
    certificate = models.BooleanField(default=False)

    class Meta:
        db_table = 'Courses'
        
    def __str__(self):
        return f"Course {self.id} - {self.title}"



