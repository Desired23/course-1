from django.urls import path
from .views import (
    InstructorLevelListCreateView,
    InstructorLevelDetailView,
    InstructorLevelUpgradeCheckView,
)

urlpatterns = [

    path('instructor-levels/', InstructorLevelListCreateView.as_view(), name='instructor-level-list'),
    path('instructor-levels/<int:level_id>/', InstructorLevelDetailView.as_view(), name='instructor-level-detail'),

    path('instructor-levels/upgrade-check/', InstructorLevelUpgradeCheckView.as_view(), name='instructor-level-upgrade-check'),
]
