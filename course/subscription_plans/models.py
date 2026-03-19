from django.db import models
from decimal import Decimal
from users.models import User
from courses.models import Course
from payments.models import Payment
from enrollments.models import Enrollment


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
    yearly_discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00'),
        help_text="Percent discount when user pays yearly, e.g. 15 = 15%"
    )
    thumbnail = models.CharField(max_length=500, blank=True, null=True)
    features = models.JSONField(
        default=list, blank=True,
        help_text="Danh sách quyền lợi gói (list of strings)"
    )
    not_included = models.JSONField(
        default=list, blank=True,
        help_text="Danh sách tính năng KHÔNG có trong gói (list of strings)"
    )
    badge_text = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="Text hiển thị trên badge, VD: 'Phổ biến nhất', 'Tiết kiệm nhất'"
    )
    icon = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="Icon name for FE display, e.g. 'Zap', 'Crown', 'Shield'"
    )
    highlight_color = models.CharField(
        max_length=20, blank=True, null=True,
        help_text="Color theme: blue, yellow, purple, etc."
    )

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
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        REMOVED = 'removed', 'Removed'

    id = models.AutoField(primary_key=True)
    plan = models.ForeignKey(
        SubscriptionPlan, on_delete=models.CASCADE,
        related_name='plan_courses'
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE,
        related_name='plan_courses'
    )
    status = models.CharField(
        max_length=10, choices=Status.choices,
        default=Status.ACTIVE
    )
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='added_plan_courses'
    )
    added_reason = models.TextField(blank=True, null=True)
    removed_at = models.DateTimeField(null=True, blank=True)
    removed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='removed_plan_courses'
    )
    scheduled_removal_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Thời điểm sẽ tự động xóa khóa học khỏi plan (sau khi thông báo 7 ngày)'
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
    notified_7d = models.BooleanField(default=False, help_text='Đã gửi thông báo 7 ngày trước khi hết hạn')
    notified_3d = models.BooleanField(default=False, help_text='Đã gửi thông báo 3 ngày trước khi hết hạn')

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


class CourseSubscriptionConsent(models.Model):
    class ConsentStatus(models.TextChoices):
        OPTED_IN = 'opted_in', 'Opted In'
        OPTED_OUT = 'opted_out', 'Opted Out'

    id = models.AutoField(primary_key=True)
    instructor = models.ForeignKey(
        'instructors.Instructor', on_delete=models.CASCADE,
        related_name='course_subscription_consents'
    )
    course = models.OneToOneField(
        Course, on_delete=models.CASCADE,
        related_name='subscription_consent'
    )
    consent_status = models.CharField(
        max_length=20,
        choices=ConsentStatus.choices,
        default=ConsentStatus.OPTED_OUT
    )
    note = models.TextField(blank=True, null=True)
    consented_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'course_subscription_consents'

    def __str__(self):
        return f"Course {self.course_id} - {self.consent_status}"


class SubscriptionUsage(models.Model):
    class UsageType(models.TextChoices):
        COURSE_ACCESS = 'course_access', 'Course Access'
        LESSON_ACCESS = 'lesson_access', 'Lesson Access'

    id = models.AutoField(primary_key=True)
    user_subscription = models.ForeignKey(
        UserSubscription, on_delete=models.CASCADE,
        related_name='usages'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='subscription_usages'
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE,
        related_name='subscription_usages'
    )
    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='subscription_usages'
    )
    usage_type = models.CharField(
        max_length=20,
        choices=UsageType.choices,
        default=UsageType.COURSE_ACCESS
    )
    usage_date = models.DateField(auto_now_add=True)
    access_count = models.IntegerField(default=1)
    consumed_minutes = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_usages'
        unique_together = (
            'user_subscription', 'user', 'course', 'usage_type', 'usage_date'
        )

    def __str__(self):
        return f"Usage {self.user_id} - {self.course_id} ({self.usage_type})"
