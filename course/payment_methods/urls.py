from django.urls import path
from .views import (
    UserPaymentMethodListCreateView,
    UserPaymentMethodDetailView,
    UserPaymentMethodSetDefaultView,
    InstructorPayoutMethodListCreateView,
    InstructorPayoutMethodDetailView,
    InstructorPayoutMethodSetDefaultView,
)

urlpatterns = [

    path('payment-methods/user/', UserPaymentMethodListCreateView.as_view(), name='user-payment-method-list'),
    path('payment-methods/user/<int:method_id>/', UserPaymentMethodDetailView.as_view(), name='user-payment-method-detail'),
    path('payment-methods/user/<int:method_id>/default/', UserPaymentMethodSetDefaultView.as_view(), name='user-payment-method-default'),


    path('payment-methods/instructor/', InstructorPayoutMethodListCreateView.as_view(), name='instructor-payout-method-list'),
    path('payment-methods/instructor/<int:method_id>/', InstructorPayoutMethodDetailView.as_view(), name='instructor-payout-method-detail'),
    path('payment-methods/instructor/<int:method_id>/default/', InstructorPayoutMethodSetDefaultView.as_view(), name='instructor-payout-method-default'),
]
