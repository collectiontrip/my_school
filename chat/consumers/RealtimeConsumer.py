import json
import jwt
from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings

from ..models import Conversation, Message


class RealtimeConsumer(AsyncWebsocketConsumer):

    # ---------------------------------------------------
    # CONNECT
    # ---------------------------------------------------

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
                id=payload.get("user_id")
            )

        except Exception as e:
            print("Realtime WS JWT error:", e)
            await self.close()
            return

        await self.accept()

        # set user online
        await database_sync_to_async(User.objects.filter(id=self.user.id).update)(
            is_online=True
        )

        self.room_group_name = f"user_{self.user.id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.channel_layer.group_add(
            "presence",
            self.channel_name
        )

        await self.broadcast_presence(self.user.id, True)

        print(f"[Realtime WS] {self.user.username} connected")

    # ---------------------------------------------------
    # DISCONNECT
    # ---------------------------------------------------

    async def disconnect(self, close_code):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

        await self.channel_layer.group_discard(
            "presence",
            self.channel_name
        )

        if self.user:
            await database_sync_to_async(User.objects.filter(id=self.user.id).update)(
                is_online=False,
                last_seen=timezone.now()
            )

            await self.broadcast_presence(self.user.id, False)

            print(f"[Realtime WS] {self.user.username} disconnected")

    # ---------------------------------------------------
    # PRESENCE BROADCAST
    # ---------------------------------------------------

    async def broadcast_presence(self, user_id, is_online):
        await self.channel_layer.group_send(
            "presence",
            {
                "type": "user_presence",
                "user_id": user_id,
                "is_online": is_online,
            }
        )

    # ---------------------------------------------------
    # PRESENCE EVENT
    # ---------------------------------------------------

    async def user_presence(self, event):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        last_seen = None

        if not event["is_online"]:
            try:
                user = await database_sync_to_async(User.objects.get)(
                    id=event["user_id"]
                )
                last_seen = user.last_seen.isoformat() if user.last_seen else None
            except User.DoesNotExist:
                pass

        await self.send(text_data=json.dumps({
            "type": "presence",
            "user_id": event["user_id"],
            "is_online": event["is_online"],
            "last_seen": last_seen
        }))

    # ---------------------------------------------------
    # RECEIVE MESSAGE
    # ---------------------------------------------------

    async def receive(self, text_data=None, bytes_data=None):

        if not text_data or not self.user:
            return

        try:
            data = json.loads(text_data)
        except Exception:
            return

        action = data.get("action")
        to_user = data.get("to_user")

        if not to_user:
            return

        try:
            to_user = int(to_user)
        except Exception:
            return

        if to_user == self.user.id:
            return

        # ------------------------------------------------
        # TYPING INDICATOR
        # ------------------------------------------------

        if action == "typing":

            payload = {
                "type": "typing_event",
                "from_user": self.user.username,
                "from_user_id": self.user.id,
                "to_user_id": to_user,
                "is_typing": data.get("is_typing", False),
            }

            await self.channel_layer.group_send(
                f"user_{to_user}",
                payload
            )
            return

        # ------------------------------------------------
        # CHAT MESSAGE
        # ------------------------------------------------

        if action == "chat_message":

            message = data.get("message")

            if not message:
                return

            msg = await self.save_message(message, to_user)

            payload = {
                "type": "chat_event",
                "message": msg.text,
                "from_user": self.user.username,
                "from_user_id": self.user.id,
                "to_user_id": to_user,
                "message_id": str(msg.id),
                "created_at": msg.created_at.isoformat(),
            }

            await self.channel_layer.group_send(f"user_{to_user}", payload)
            await self.channel_layer.group_send(self.room_group_name, payload)

            return

        # ------------------------------------------------
        # CALL / WEBRTC SIGNAL
        # ------------------------------------------------

        allowed_call_actions = (
            "call_request",
            "call_accept",
            "call_reject",
            "call_end",
            "webrtc_offer",
            "webrtc_answer",
            "webrtc_ice",
        )

        if action in allowed_call_actions:

            payload = {
                "type": "call_event",
                "action": action,
                "from_user": self.user.username,
                "from_user_id": self.user.id,
                "to_user_id": to_user,
            }

            if action.startswith("webrtc_"):
                payload["data"] = data.get("data")

            await self.channel_layer.group_send(
                f"user_{to_user}",
                payload
            )

            print("[Realtime WS] call signal:", payload)

    # ---------------------------------------------------
    # CHAT EVENT
    # ---------------------------------------------------

    async def chat_event(self, event):

        await self.send(text_data=json.dumps({
            "type": "chat",
            "message": event["message"],
            "from_user": event["from_user"],
            "from_user_id": event["from_user_id"],
            "to_user_id": event["to_user_id"],
            "message_id": event["message_id"],
            "created_at": event["created_at"],
        }))

    # ---------------------------------------------------
    # CALL EVENT
    # ---------------------------------------------------

    async def call_event(self, event):

        response = {
            "type": "call",
            "action": event["action"],
            "from_user": event["from_user"],
            "from_user_id": event["from_user_id"],
            "to_user_id": event["to_user_id"],
        }

        if event.get("data") is not None:
            response["data"] = event["data"]

        await self.send(text_data=json.dumps(response))

    # ---------------------------------------------------
    # TYPING EVENT
    # ---------------------------------------------------

    async def typing_event(self, event):

        await self.send(text_data=json.dumps({
            "type": "typing",
            "from_user": event["from_user"],
            "from_user_id": event["from_user_id"],
            "to_user_id": event["to_user_id"],
            "is_typing": event["is_typing"],
        }))

    # ---------------------------------------------------
    # DATABASE FUNCTION
    # ---------------------------------------------------

    @database_sync_to_async
    def save_message(self, message, to_user_id):

        from django.contrib.auth import get_user_model
        User = get_user_model()

        receiver = User.objects.get(id=to_user_id)

        conversation = Conversation.objects.filter(
            participants=self.user
        ).filter(
            participants=receiver
        ).first()

        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(self.user, receiver)

        msg = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            text=message,
            message_type="text"
        )

        return msg