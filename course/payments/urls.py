from django.urls import path
from .views import CreateVnpayPaymentView, VnpayReturnView, CreatePaymentRecordView, VnpayIPNView, PaymentStatusView, CheckEnrollmentView
# , VnpayReturnView, CreatePaymentRecordView

urlpatterns = [
    path('vnpay/create/', CreateVnpayPaymentView.as_view(), name='vnpay-create'),
    path('vnpay/ipn/', VnpayIPNView.as_view(), name='vnpay-ipn'),
    path('payment/create/', CreatePaymentRecordView.as_view(), name='payment-create'),
    path('vnpay/return/', VnpayReturnView.as_view(), name='vnpay-return'),
    path('payments/status/<int:payment_id>/', PaymentStatusView.as_view(), name='payment-status'),
    path('payments/check-enrollment/<int:course_id>/', CheckEnrollmentView.as_view(), name='check-enrollment'),
]
