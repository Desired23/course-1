from django.db import models
from users.models import User


class UserPaymentMethod(models.Model):
    """
    Lưu phương thức thanh toán của user (student/instructor) để checkout nhanh.
    Dùng cho: mua course, mua subscription.
    """
    class MethodType(models.TextChoices):
        VNPAY = 'vnpay', 'VNPay'
        MOMO = 'momo', 'MoMo'
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        CREDIT_CARD = 'credit_card', 'Credit Card'

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    method_type = models.CharField(max_length=20, choices=MethodType.choices)
    is_default = models.BooleanField(default=False)
    nickname = models.CharField(max_length=100, blank=True, null=True,
                                help_text="Tên hiển thị ví dụ: 'Thẻ cá nhân', 'Ví MoMo công ty'")


    gateway_token = models.CharField(max_length=512, blank=True, null=True,
                                     help_text="Token từ payment gateway (không phải số thẻ thô)")
    masked_account = models.CharField(max_length=50, blank=True, null=True,
                                      help_text="VD: ****6789 hoặc 09*****23")


    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_branch = models.CharField(max_length=200, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    account_name = models.CharField(max_length=200, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'UserPaymentMethods'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.method_type} ({'default' if self.is_default else 'saved'})"


class InstructorPayoutMethod(models.Model):
    """
    Tài khoản nhận tiền của instructor (dùng khi yêu cầu payout).
    """
    class MethodType(models.TextChoices):
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        MOMO = 'momo', 'MoMo'
        VNPAY = 'vnpay', 'VNPay'

    id = models.AutoField(primary_key=True)
    instructor = models.ForeignKey('instructors.Instructor', on_delete=models.CASCADE,
                                   related_name='payout_methods')
    method_type = models.CharField(max_length=20, choices=MethodType.choices)
    is_default = models.BooleanField(default=False)
    nickname = models.CharField(max_length=100, blank=True, null=True,
                                help_text="VD: 'Tài khoản VCB cá nhân'")


    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_branch = models.CharField(max_length=200, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    account_name = models.CharField(max_length=200, blank=True, null=True)


    wallet_phone = models.CharField(max_length=20, blank=True, null=True,
                                    help_text="Số điện thoại ví điện tử")
    masked_account = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'InstructorPayoutMethods'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.instructor.user.full_name} - {self.method_type} ({'default' if self.is_default else 'saved'})"
