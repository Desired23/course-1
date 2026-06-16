from django.urls import path
from .views import SupportListView, SupportResolveView

urlpatterns = [
    path('supports/', SupportListView.as_view(), name='supports-list'),
    path('supports/create/', SupportListView.as_view(), name='supports-create'),
    path('supports/<int:support_id>/update/', SupportListView.as_view(), name='supports-update'),
    path('supports/<int:support_id>/admin_update/', SupportListView.as_view(), name='supports-admin-update'),
    path('supports/<int:support_id>/resolve/', SupportResolveView.as_view(), name='supports-resolve'),
    path('supports/<int:support_id>/delete/', SupportListView.as_view(), name='supports-delete'),
]
