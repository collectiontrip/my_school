import json
import jwt

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings


class CallConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        self.user = None
        self.room_group_name = None

        query_string = self.scope.get("query_string", b"").decode()
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

            self.user = await database_sync_to_async(User.objects.get)(
                id=payload["user_id"]
            )

        except Exception as e:
            print("Call WS JWT error:", e)
            await self.close()
            return

        await self.accept()

        self.room_group_name = f"user_{self.user.id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        print(f"[CALL WS] {self.user.username} connected")


    async def disconnect(self, close_code):

        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

        if self.user:
            print(f"[CALL WS] {self.user.username} disconnected")


    async def receive(self, text_data=None, bytes_data=None):

        if not text_data or not self.user:
            return

        try:
            data = json.loads(text_data)
        except:
            return

        action = data.get("action")
        to_user_id = data.get("to_user")

        allowed_actions = (
            "call_request",
            "call_accept",
            "call_reject",
            "call_end",
        )

        if action not in allowed_actions:
            return

        try:
            to_user_id = int(to_user_id)
        except:
            return

        # self call block
        if to_user_id == self.user.id:
            return

        payload = {
            "type": "call_signal",
            "action": action,

            "from_user": self.user.username,
            "from_user_id": self.user.id,

            "to_user_id": to_user_id,
        }

        # -------------------------------
        # send to receiver
        # -------------------------------
        await self.channel_layer.group_send(
            f"user_{to_user_id}",
            payload
        )

        # -------------------------------
        # send back to caller also
        # -------------------------------
        await self.channel_layer.group_send(
            self.room_group_name,
            payload
        )

        print("[CALL WS] signal:", payload)


    async def call_signal(self, event):

        # frontend expects same structure
        await self.send(text_data=json.dumps({
            "action": event["action"],

            "from_user": event["from_user"],
            "from_user_id": event["from_user_id"],

            "to_user_id": event["to_user_id"],
        }))
