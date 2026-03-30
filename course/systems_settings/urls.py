from django.urls import path
from .views import SystemsSettingsView, PublicHomeSettingsView
urlpatterns = [
    path('systems_settings/', SystemsSettingsView.as_view(), name='system-settings-list'),
    path('systems_settings/create/', SystemsSettingsView.as_view(), name='system-settings-create'),
    path('systems_settings/<int:setting_id>/update/', SystemsSettingsView.as_view(), name='system-settings-update'),
    path('systems_settings/<int:setting_id>/delete/', SystemsSettingsView.as_view(), name='system-settings-delete'),
    path('systems_settings/public/homepage/', PublicHomeSettingsView.as_view(), name='system-settings-public-homepage'),
]
