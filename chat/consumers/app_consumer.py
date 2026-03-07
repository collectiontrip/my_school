import json
import jwt

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings


class AppConsumer(AsyncWebsocketConsumer):

    # ---------------- CONNECT ----------------
    async def connect(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        query_string = self.scope.get("query_string", b"").decode()
        token = None

        if "token=" in query_string:
            token = query_string.split("token=")[-1]

        if not token:
            await self.close()
            return

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            self.user = await database_sync_to_async(User.objects.get)(
                id=payload["user_id"]
            )
        except Exception as e:
            print("JWT error:", e)
            await self.close()
            return

        await self.accept()

        # user group
        self.room_group_name = f"user_{self.user.id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        print(f"[WS CONNECTED] {self.user.username}")

    # ---------------- DISCONNECT ----------------
    async def disconnect(self, close_code):

        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

        print(f"[WS DISCONNECTED] {self.user.username}")


    # ---------------- RECEIVE ----------------
    async def receive(self, text_data):

        if not text_data:
            return

        data = json.loads(text_data)

        action = data.get("action")
        to_user = data.get("to_user")

        if not action:
            return


        # -------- CHAT MESSAGE --------
        if action == "chat_message":

            message = data.get("message")

            payload = {
                "type": "chat_message",
                "action": "chat_message",
                "message": message,
                "from_user": self.user.username,
                "from_user_id": self.user.id,
                "to_user_id": to_user
            }

            await self.channel_layer.group_send(
                f"user_{to_user}",
                payload
            )

            # echo back to sender
            await self.send(text_data=json.dumps(payload))


        # -------- CALL SIGNAL --------
        elif action in [
            "call_request",
            "call_accept",
            "call_reject",
            "call_end",
            "webrtc_offer",
            "webrtc_answer",
            "webrtc_ice"
        ]:

            payload = {
                "type": "call_signal",
                "action": action,
                "from_user": self.user.username,
                "from_user_id": self.user.id,
                "to_user_id": to_user
            }

            if action in ["webrtc_offer", "webrtc_answer", "webrtc_ice"]:
                payload["data"] = data.get("data")

            await self.channel_layer.group_send(
                f"user_{to_user}",
                payload
            )


        # -------- TYPING --------
        elif action == "typing":

            payload = {
                "type": "typing",
                "action": "typing",
                "from_user_id": self.user.id
            }

            await self.channel_layer.group_send(
                f"user_{to_user}",
                payload
            )


        # -------- SEEN --------
        elif action == "seen":

            payload = {
                "type": "seen",
                "action": "seen",
                "from_user_id": self.user.id
            }

            await self.channel_layer.group_send(
                f"user_{to_user}",
                payload
            )


    # ---------------- SENDERS ----------------

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))


    async def call_signal(self, event):
        await self.send(text_data=json.dumps(event))


    async def typing(self, event):
        await self.send(text_data=json.dumps(event))


    async def seen(self, event):
        await self.send(text_data=json.dumps(event))