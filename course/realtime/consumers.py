# realtime/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if user.is_authenticated:
            self.group_name = f"user_{user.user_id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Bạn có thể xử lý tin nhắn gửi từ client nếu cần
        print(f"Received message: {text_data}")
        await self.send(text_data=json.dumps({"message": "Message received"}))
        pass

    async def send_notification(self, event):
        await self.send_json({
            "type": "notification",
            "data": event["data"],
        })
class LessonCommentConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.lesson_id = self.scope["url_route"]["kwargs"]["lesson_id"]
        self.group_name = f"lesson_{self.lesson_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_comment(self, event):
        await self.send_json(event["data"])
