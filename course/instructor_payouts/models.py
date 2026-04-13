from django.db import models
from decimal import Decimal
from instructors.models import Instructor
from admins.models import Admin

class InstructorPayout(models.Model):
    class PayoutStatusChoices(models.TextChoices):
        PENDING = 'pending', 'pending'
        PROCESSED = 'processed', 'processed'
        CANCELLED = 'cancelled', 'cancelled'
        FAILED = 'failed', 'failed'

    id = models.AutoField(primary_key=True)
    instructor = models.ForeignKey(Instructor, on_delete=models.CASCADE, related_name='payouts')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    fee = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    net_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    payment_method = models.CharField(max_length=100)
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=PayoutStatusChoices.choices, default=PayoutStatusChoices.PENDING)
    request_date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_instructor_payouts')
    is_deleted = models.BooleanField(default=False)
    processed_date = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    period = models.CharField(max_length=20)
    processed_by = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_payouts')

    class Meta:
        db_table = 'InstructorPayouts'
        ordering = ['-request_date']

    def __str__(self):
        return f"Payout #{self.id} - {self.instructor.user.full_name} - {self.status}"
