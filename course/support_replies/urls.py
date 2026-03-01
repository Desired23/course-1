from django.urls import path
from .views import SupportReplyDetailView, SupportReplyListView

urlpatterns = [
    path('replies/', SupportReplyListView.as_view(), name='support_reply_list'),
    path('replies/support/<int:support_id>/', SupportReplyListView.as_view(), name='support_replies_by_support'),
    path('replies/<int:reply_id>/', SupportReplyDetailView.as_view(), name='support_reply_detail'),
    path('replies/<int:reply_id>/delete/', SupportReplyDetailView.as_view(), name='support_reply_delete'),
]
