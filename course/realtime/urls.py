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
    path('chat/rooms/', views.ChatRoomListView.as_view(), name='chat-rooms'),
    path('chat/rooms/<int:room_id>/messages/', views.ChatMessageListView.as_view(), name='chat-messages'),
    path('chat/rooms/<int:room_id>/read/', views.ChatMarkReadView.as_view(), name='chat-mark-read'),
]