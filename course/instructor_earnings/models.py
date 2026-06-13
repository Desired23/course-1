from django.db import models
from instructors.models import Instructor
from courses.models import Course
from payments.models import Payment
from instructor_payouts.models import InstructorPayout

class InstructorEarning(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'pending'
        AVAILABLE = 'available', 'available'
        PAID = 'paid', 'paid'
        CANCELLED = 'cancelled', 'cancelled'

    id = models.AutoField(primary_key=True)
    instructor = models.ForeignKey(Instructor, on_delete=models.CASCADE, related_name='earnings')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='earnings')
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL,
        related_name='instructor_earnings',
        null=True, blank=True
    )
    user_subscription = models.ForeignKey(
        'subscription_plans.UserSubscription',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='instructor_earnings',
        help_text='Earning từ subscription (revenue sharing)'
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)

    platform_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="% nền tảng giữ lại tại thời điểm earning được tạo"
    )
    instructor_share_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="% giảng viên nhận tại thời điểm earning được tạo"
    )
    instructor_level_id_snapshot = models.IntegerField(null=True, blank=True)
    instructor_level_name_snapshot = models.CharField(max_length=100, null=True, blank=True)

    usage_share_rate = models.DecimalField(
        max_digits=7, decimal_places=4, null=True, blank=True,
        help_text="% usage của course/instructor trong kỳ subscription"
    )
    usage_seconds = models.IntegerField(default=0)

    earning_period_start = models.DateField(null=True, blank=True)
    earning_period_end = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    )

    earning_date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_instructor_earnings')
    is_deleted = models.BooleanField(default=False)
    instructor_payout = models.ForeignKey(
        InstructorPayout, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='earnings'
    )

    class Meta:
        db_table = 'InstructorEarnings'
        ordering = ['-created_at']
        verbose_name = 'Instructor Earning'
        verbose_name_plural = 'Instructor Earnings'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['instructor']),
            models.Index(fields=['course']),
            models.Index(fields=['instructor', 'is_deleted', 'earning_date']),
            models.Index(fields=['instructor', 'is_deleted', 'status']),
            models.Index(fields=['is_deleted', 'earning_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['payment', 'course', 'instructor'],
                condition=models.Q(payment__isnull=False),
                name='unique_earning_per_payment_course_instructor',
            ),
            models.UniqueConstraint(
                fields=['user_subscription', 'course', 'instructor', 'earning_period_start'],
                condition=models.Q(user_subscription__isnull=False),
                name='unique_subscription_earning_per_period_course_instructor',
            ),
        ]

    def __str__(self):
        return f"[{self.id}] {self.instructor.user.full_name} - {self.course.title} - {self.net_amount} VND"
