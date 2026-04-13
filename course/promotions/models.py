from django.db import models
from decimal import Decimal
from admins.models import Admin
from instructors.models import Instructor
from courses.models import Course
from instructors.models import Instructor

class Promotion(models.Model):
    class DiscountTypeChoices(models.TextChoices):
        PERCENTAGE = 'percentage', 'percentage'
        FIXED_AMOUNT = 'fixed', 'fixed'

    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'active'
        INACTIVE = 'inactive', 'inactive'
        EXPIRED = 'expired', 'expired'

    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    discount_type = models.CharField(max_length=20, choices=DiscountTypeChoices.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    usage_limit = models.IntegerField(blank=True, null=True)
    used_count = models.IntegerField(default=0)
    min_purchase = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    applicable_courses = models.ManyToManyField(Course,blank=True,related_name="promotions")
    applicable_categories = models.ManyToManyField('categories.Category', blank=True, related_name="promotions")

    admin = models.ForeignKey(Admin, on_delete=models.SET_NULL, related_name='promotions_admin', null=True)
    instructor = models.ForeignKey(Instructor, on_delete=models.SET_NULL, related_name='promotions_instructor', null=True)

    status = models.CharField(max_length=10, choices=StatusChoices.choices, default=StatusChoices.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_promotions')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'Promotions'

    def __str__(self):
        return f"{self.code} ({self.discount_type} - {self.id})"
