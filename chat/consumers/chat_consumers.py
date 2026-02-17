import json
import jwt
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings

class PrivateChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()  # ✅ Move inside connect()

        self.room_group_name = None

        query_string = self.scope["query_string"].decode()
        token = None

        if "token=" in query_string:
            token = query_string.split("token=")[-1]

        if not token:
            await self.close()
            return

        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"]
            )

            # ORM call async
            self.user = await database_sync_to_async(User.objects.get)(
                id=payload["user_id"]
            )

        except Exception as e:
            print("JWT error or invalid token:", e)
            await self.close()
            return

        await self.accept()

        # Room per user
        self.room_group_name = f"user_{self.user.id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        print(f"{self.user.username} connected to WebSocket")

    async def disconnect(self, close_code):
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        print("WebSocket disconnected")

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        data = json.loads(text_data)
        message = data.get("message")
        to_user = data.get("to_user")

        if not message or not to_user:
            return

        payload = {
            "type": "chat_message",
            "message": message,
            "from_user": self.user.username,
            "from_user_id": self.user.id,
            "to_user_id": int(to_user)
        }

        # Send to receiver
        await self.channel_layer.group_send(
            f"user_{to_user}",
            payload
        )

        # Send back to sender
        await self.channel_layer.group_send(
            self.room_group_name,
            payload
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "from_user": event["from_user"],
            "from_user_id": event["from_user_id"],
            "to_user_id": event["to_user_id"],
        }))