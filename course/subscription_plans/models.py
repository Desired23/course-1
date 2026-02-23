from django.db import models
from decimal import Decimal
from users.models import User
from courses.models import Course
from payments.models import Payment


class SubscriptionPlan(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        ARCHIVED = 'archived', 'Archived'

    class DurationType(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly (3 months)'
        SEMI_ANNUAL = 'semi_annual', 'Semi-Annual (6 months)'
        ANNUAL = 'annual', 'Annual'
        LIFETIME = 'lifetime', 'Lifetime'

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    duration_type = models.CharField(
        max_length=20, choices=DurationType.choices,
        default=DurationType.MONTHLY
    )
    duration_days = models.IntegerField(default=30)
    status = models.CharField(
        max_length=10, choices=Status.choices,
        default=Status.ACTIVE
    )
    is_featured = models.BooleanField(default=False)
    max_subscribers = models.IntegerField(null=True, blank=True)
    instructor_share_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('60.00')
    )
    thumbnail = models.CharField(max_length=500, blank=True, null=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_subscription_plans'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['price']

    def __str__(self):
        return f"{self.name} - {self.price} ({self.duration_type})"

    @property
    def effective_price(self):
        if self.discount_price and self.discount_price < self.price:
            return self.discount_price
        return self.price

    @property
    def current_subscribers(self):
        return self.subscriptions.filter(
            status='active', is_deleted=False
        ).count()


class PlanCourse(models.Model):
    id = models.AutoField(primary_key=True)
    plan = models.ForeignKey(
        SubscriptionPlan, on_delete=models.CASCADE,
        related_name='plan_courses'
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE,
        related_name='plan_courses'
    )
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='added_plan_courses'
    )
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'plan_courses'
        unique_together = ('plan', 'course')

    def __str__(self):
        return f"{self.plan.name} -> {self.course.title}"


class UserSubscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    plan = models.ForeignKey(
        SubscriptionPlan, on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='subscriptions'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.ACTIVE
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_subscriptions'
        ordering = ['-start_date']

    def __str__(self):
        return f"User {self.user_id} - Plan {self.plan.name} ({self.status})"

    @property
    def is_active(self):
        from django.utils import timezone
        if self.status != 'active':
            return False
        if self.end_date and self.end_date < timezone.now():
            return False
        return True
