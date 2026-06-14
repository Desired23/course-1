from django.urls import path
from .views import (
    PlatformSettingsView, PublicHomeSettingsView, PublicBrandingView, PayoutSettingsView,
    PlatformConfigView, PolicyDocumentsView, PublicPoliciesView,
)
urlpatterns = [
    path('platform-settings/', PlatformSettingsView.as_view(), name='platform-settings-list'),
    path('platform-settings/config/', PlatformConfigView.as_view(), name='platform-settings-config'),
    path('platform-settings/policies/', PolicyDocumentsView.as_view(), name='platform-settings-policies'),
    path('platform-settings/public/policies/', PublicPoliciesView.as_view(), name='platform-settings-public-policies'),
    path('platform-settings/payout/', PayoutSettingsView.as_view(), name='platform-settings-payout'),
    path('platform-settings/create/', PlatformSettingsView.as_view(), name='platform-settings-create'),
    path('platform-settings/<int:setting_id>/update/', PlatformSettingsView.as_view(), name='platform-settings-update'),
    path('platform-settings/<int:setting_id>/delete/', PlatformSettingsView.as_view(), name='platform-settings-delete'),
    path('platform-settings/public/homepage/', PublicHomeSettingsView.as_view(), name='platform-settings-public-homepage'),
    path('platform-settings/public/branding/', PublicBrandingView.as_view(), name='platform-settings-public-branding'),
]
