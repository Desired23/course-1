from django.urls import path
from .views import (
    PromotionManagementView,
    PromotionValidateView,
)
urlpatterns = [
    path('promotions/<int:promotion_id>/update', PromotionManagementView.as_view(), name='promotion-update'),
    path('promotions/<int:promotion_id>/delete', PromotionManagementView.as_view(), name='promotion-delete'),
    path('promotions/', PromotionManagementView.as_view(), name='promotion-list'),
    path('promotions/create', PromotionManagementView.as_view(), name='promotion-create'),
    path('promotions/validate/', PromotionValidateView.as_view(), name='promotion-validate'),
]