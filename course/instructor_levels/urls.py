from django.urls import path
from .views import (
    InstructorLevelListCreateView,
    InstructorLevelDetailView,
    InstructorLevelUpgradeCheckView,
)

urlpatterns = [
    # CRUD levels  (admin)
    path('instructor-levels/', InstructorLevelListCreateView.as_view(), name='instructor-level-list'),
    path('instructor-levels/<int:level_id>/', InstructorLevelDetailView.as_view(), name='instructor-level-detail'),
    # Trigger level-upgrade check (admin job)
    path('instructor-levels/upgrade-check/', InstructorLevelUpgradeCheckView.as_view(), name='instructor-level-upgrade-check'),
]
