from django.urls import path
from .views import (
    CreateVnpayPaymentView, VnpayPaymentReturnView, RefundDetailView,
    CreatePaymentRecordView, VnpayIPNView, PaymentStatusView,
    CheckEnrollmentView, AdminRefundUpdateView, UserRefundListView,
    UserPaymentListView, AdminPaymentFixView, AdminPaymentListView, AdminPaymentConfigView,
    AdminRefundActionView,
    CreateMomoPaymentView, MomoIPNView, MomoPaymentReturnView,
)

urlpatterns = [
    path('vnpay/create/', CreateVnpayPaymentView.as_view(), name='vnpay-create'),
    path('vnpay/ipn/', VnpayIPNView.as_view(), name='vnpay-ipn'),
    path('vnpay/payment-return/', VnpayPaymentReturnView.as_view(), name='vnpay-payment-return'),
    path('momo/create/', CreateMomoPaymentView.as_view(), name='momo-create'),
    path('momo/ipn/', MomoIPNView.as_view(), name='momo-ipn'),
    path('momo/payment-return/', MomoPaymentReturnView.as_view(), name='momo-payment-return'),
    path('payment/create/', CreatePaymentRecordView.as_view(), name='payment-create'),
    path('payments/status/<int:payment_id>/', PaymentStatusView.as_view(), name='payment-status'),
    path('payments/', AdminPaymentListView.as_view(), name='payment-list'),
    path('payments/fix/', AdminPaymentFixView.as_view(), name='payment-fix'),
    path('payments/admin/config/<str:config_key>/', AdminPaymentConfigView.as_view(), name='payment-admin-config'),
    path('payments/check-enrollment/<int:course_id>/', CheckEnrollmentView.as_view(), name='check-enrollment'),
    path('payments/refund/admin/', AdminRefundUpdateView.as_view(), name='admin-refund-update'),
    path('payments/refund/admin/action/', AdminRefundActionView.as_view(), name='admin-refund-action'),


    path('payments/my/', UserPaymentListView.as_view(), name='user-payment-list'),


    path('refunds/', UserRefundListView.as_view(), name='user-refund-list'),
    path('refunds/request/', UserRefundListView.as_view(), name='user-refund-request'),
    path('refunds/details/', RefundDetailView.as_view(), name='refund-details'),
]
