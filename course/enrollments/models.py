from django.db import models
from decimal import Decimal
from users.models import User
from courses.models import Course

class Enrollment(models.Model):
    class Status(models.TextChoices):
        Active = "active"
        Complete = "complete"
        Expired = "expired"
        Cancelled = "cancelled"
        SUSPENDED = "suspended"

    class Source(models.TextChoices):
        PURCHASE = 'purchase', 'Purchase'
        SUBSCRIPTION = 'subscription', 'Subscription'

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollment_user')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, related_name='enrollment_course', null=True, blank=True)
    payment = models.ForeignKey('payments.Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name='enrollments')
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.PURCHASE
    )
    subscription = models.ForeignKey(
        'subscription_plans.UserSubscription',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='enrollments'
    )
    enrollment_date = models.DateTimeField(blank=True, null=True)
    expiry_date = models.DateTimeField(blank=True, null = True)
    completion_date = models.DateTimeField(blank=True, null = True)
    progress = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.Active
    )
    certificate = models.CharField(max_length=255, blank=True, null=True)
    certificate_issue_date = models.DateTimeField(null=True, blank=True)
    last_access_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_enrollments')
    is_deleted = models.BooleanField(default=False)
    class Meta:
        db_table = 'Enrollments'
        constraints = [
            models.UniqueConstraint(fields=['user', 'course'], name='unique_enrollment')
        ]

    def __str__(self):
        return f"Enrollment {self.status} - {self.certificate}"



