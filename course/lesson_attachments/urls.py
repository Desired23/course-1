from django.urls import path
from .views import (
    LessonAttachmentManagementView,
    LessonAttachmentDetailView,
    LessonAttachmentListView,
    LessonAttachmentDownloadView,

)
urlpatterns = [
    path('attachments/', LessonAttachmentListView.as_view(), name='lesson-attachment-list'),
    path('attachments/lesson/<int:lesson_id>/', LessonAttachmentManagementView.as_view(), name='lesson-attachment-by-lesson'),
    path('attachments/detail/<int:attachment_id>/', LessonAttachmentDetailView.as_view(), name='lesson-attachment-detail'),
    path('attachments/<int:attachment_id>/download/', LessonAttachmentDownloadView.as_view(), name='lesson-attachment-download'),
    path('attachments/create/', LessonAttachmentManagementView.as_view(), name='lesson-attachment-create'),
    path('attachments/update/<int:attachment_id>/', LessonAttachmentManagementView.as_view(), name='lesson-attachment-update'),
    path('attachments/delete/<int:attachment_id>/', LessonAttachmentManagementView.as_view(), name='lesson-attachment-delete'),
]
