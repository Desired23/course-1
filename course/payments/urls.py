from django.urls import path
from .views import (
    CreateVnpayPaymentView, VnpayPaymentReturnView, RefundDetailView,
    CreatePaymentRecordView, VnpayIPNView, PaymentStatusView,
    CheckEnrollmentView, AdminRefundUpdateView, UserRefundListView,
)

urlpatterns = [
    path('vnpay/create/', CreateVnpayPaymentView.as_view(), name='vnpay-create'),
    path('vnpay/ipn/', VnpayIPNView.as_view(), name='vnpay-ipn'),
    path('vnpay/payment-return/', VnpayPaymentReturnView.as_view(), name='vnpay-payment-return'),
    path('payment/create/', CreatePaymentRecordView.as_view(), name='payment-create'),
    path('payments/status/<int:payment_id>/', PaymentStatusView.as_view(), name='payment-status'),
    path('payments/check-enrollment/<int:course_id>/', CheckEnrollmentView.as_view(), name='check-enrollment'),
    path('payments/refund/admin/', AdminRefundUpdateView.as_view(), name='admin-refund-update'),

    # Refund endpoints
    path('refunds/', UserRefundListView.as_view(), name='user-refund-list'),
    path('refunds/request/', UserRefundListView.as_view(), name='user-refund-request'),
    path('refunds/details/', RefundDetailView.as_view(), name='refund-details'),
]
