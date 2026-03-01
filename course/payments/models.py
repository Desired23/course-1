from django.db import models
from decimal import Decimal
from users.models import User
from courses.models import Course
from promotions.models import Promotion
class Payment(models.Model):
    class PaymentStatus(models.TextChoices):
        PENDING = 'pending', 'pending'
        COMPLETED = 'completed', 'completed'
        FAILED = 'failed', 'failed'
        REFUNDED = 'refunded', 'refunded'
        CANCELLED = 'cancelled', 'cancelled'
    class PaymentMethod(models.TextChoices):
        VNPAY = 'vnpay', 'vnpay'
        MOMO = 'momo', 'momo'
    class PaymentType(models.TextChoices):
        COURSE_PURCHASE = 'course_purchase', 'Course Purchase'
        SUBSCRIPTION = 'subscription', 'Subscription'
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_user_id')
    payment_type = models.CharField(
        max_length=20,
        choices=PaymentType.choices,
        default=PaymentType.COURSE_PURCHASE
    )
    subscription_plan = models.ForeignKey(
        'subscription_plans.SubscriptionPlan',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=False)
    transaction_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.VNPAY 
    )
    promotion = models.ForeignKey(
        Promotion, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='payments_discount'
    )
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    payment_gateway = models.CharField(max_length=255, default='', blank=True)
    gateway_response = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_payments')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = "payments"

    def __str__(self):
        return f"Payment {self.transaction_id} - {self.payment_status} - {self.id} - {self.payment_date} DATE"
