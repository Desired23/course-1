from django.urls import re_path, path
from .consumers import NotificationConsumer, ChatConsumer, LessonCommentConsumer
from . import views

# WebSocket routes (used by ASGI router)
websocket_urlpatterns = [
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
    re_path(r'ws/chat/(?P<room_id>\d+)/$', ChatConsumer.as_asgi()),
    re_path(r'ws/lessons/(?P<lesson_id>\d+)/comments/$', LessonCommentConsumer.as_asgi()),
]

# REST API routes for chat (included in config/urls.py)
urlpatterns = [
    path('chat/users/search/', views.ChatUserSearchView.as_view(), name='chat-user-search'),
    path('chat/rooms/', views.ChatRoomListView.as_view(), name='chat-rooms'),
    path('chat/rooms/<int:room_id>/messages/', views.ChatMessageListView.as_view(), name='chat-messages'),
    path('chat/rooms/<int:room_id>/read/', views.ChatMarkReadView.as_view(), name='chat-mark-read'),
    path('chat/conversations/', views.ConversationListView.as_view(), name='chat-conversations'),
    path('chat/conversations/<int:conversation_id>/', views.ConversationDetailView.as_view(), name='chat-conversation-detail'),
    path('chat/conversations/<int:conversation_id>/messages/', views.ConversationMessageListView.as_view(), name='chat-conversation-messages'),
    path('chat/conversations/<int:conversation_id>/read/', views.ConversationReadView.as_view(), name='chat-conversation-read'),
    path('chat/conversations/<int:conversation_id>/participants/', views.ConversationParticipantListView.as_view(), name='chat-conversation-participants'),
    path('chat/conversations/<int:conversation_id>/participants/<int:user_id>/', views.ConversationParticipantDetailView.as_view(), name='chat-conversation-participant-detail'),
    path('chat/messages/<int:message_id>/', views.ConversationMessageDetailView.as_view(), name='chat-message-detail'),
    path('chat/messages/<int:message_id>/report/', views.MessageReportView.as_view(), name='chat-message-report'),
    path('chat/messages/<int:message_id>/moderate/', views.MessageModerationView.as_view(), name='chat-message-moderate'),
    path('chat/messages/<int:message_id>/reactions/', views.MessageReactionView.as_view(), name='chat-message-reactions'),
    path('chat/messages/<int:message_id>/reactions/<str:reaction>/', views.MessageReactionView.as_view(), name='chat-message-reaction-detail'),
]
