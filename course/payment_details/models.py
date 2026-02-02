from django.db import models
from decimal import Decimal
from payments.models import Payment
from courses.models import Course
from promotions.models import Promotion
class Payment_Details(models.Model):
    class RefundStatus(models.TextChoices):
        PENDING = "pending", "Pending approval"
        APPROVED = "approved", "Approved - waiting for refund"
        SUCCESS = "success", "Refunded successfully"
        REJECTED = "rejected", "Rejected"
        FAILED = "failed", "Refund failed"
    payment_id = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='payment_details')
    course_id = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='payment_details')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    promotion_id = models.ForeignKey(Promotion, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_details')
    refund_transaction_id = models.CharField(max_length=100, null=True, blank=True)
    refund_status = models.CharField(max_length=20, choices=RefundStatus.choices, default='pending')
    refund_request_time = models.DateTimeField(null=True, blank=True)
    refund_response_code = models.CharField(max_length=10, null=True, blank=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    refund_reason = models.TextField(null=True, blank=True)
    refund_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_payment_details')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'payment_details'
        unique_together = ('payment_id', 'course_id')

    def __str__(self):
        return f"Payment {self.payment_id} - {self.course_id} - {self.final_price}"