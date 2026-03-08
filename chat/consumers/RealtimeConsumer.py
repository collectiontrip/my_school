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
    # PRESENCE
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

    async def user_presence(self, event):

        last_seen = None

        if not event["is_online"]:
            last_seen = await self.get_last_seen(event["user_id"])

        await self.send(text_data=json.dumps({
            "type": "presence",
            "user_id": event["user_id"],
            "is_online": event["is_online"],
            "last_seen": last_seen
        }))

    # ---------------------------------------------------
    # RECEIVE
    # ---------------------------------------------------

    async def receive(self, text_data=None, bytes_data=None):

        if not text_data or not self.user:
            return

        try:
            data = json.loads(text_data)
        except:
            return

        action = data.get("action")
        to_user = data.get("to_user")

        if not to_user:
            return

        to_user = int(to_user)

        if to_user == self.user.id:
            return

        # ------------------------------------------------
        # TYPING
        # ------------------------------------------------

        if action == "typing":

            await self.channel_layer.group_send(
                f"user_{to_user}",
                {
                    "type": "typing_event",
                    "from_user": self.user.username,
                    "from_user_id": self.user.id,
                    "to_user_id": to_user,
                    "is_typing": data.get("is_typing", False),
                }
            )
            return

        # ------------------------------------------------
        # MESSAGE SEEN
        # ------------------------------------------------

        if action == "seen":

            msg_id = data.get("message_id")

            await self.mark_seen(msg_id)

            payload = {
                "type": "message_seen",
                "message_id": msg_id,
                "seen_by": self.user.id
            }

            await self.channel_layer.group_send(
                f"user_{to_user}",
                payload
            )

            await self.channel_layer.group_send(
                self.room_group_name,
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
                "is_delivered": True
            }

            await self.channel_layer.group_send(f"user_{to_user}", payload)
            await self.channel_layer.group_send(self.room_group_name, payload)

            return

        # ------------------------------------------------
        # CALL / WEBRTC
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
                "data": data.get("data")
            }

            await self.channel_layer.group_send(
                f"user_{to_user}",
                payload
            )

    # ---------------------------------------------------
    # EVENTS
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
            "is_delivered": event.get("is_delivered", False)
        }))

    async def call_event(self, event):

        await self.send(text_data=json.dumps({
            "type": "call",
            "action": event["action"],
            "from_user": event["from_user"],
            "from_user_id": event["from_user_id"],
            "to_user_id": event["to_user_id"],
            "data": event.get("data")
        }))

    async def typing_event(self, event):

        await self.send(text_data=json.dumps({
            "type": "typing",
            "from_user": event["from_user"],
            "from_user_id": event["from_user_id"],
            "to_user_id": event["to_user_id"],
            "is_typing": event["is_typing"],
        }))

    async def message_seen(self, event):

        await self.send(text_data=json.dumps({
            "type": "seen",
            "message_id": event["message_id"],
            "seen_by": event["seen_by"]
        }))

    # ---------------------------------------------------
    # DATABASE
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
            message_type="text",
            is_delivered=True
        )

        return msg

    @database_sync_to_async
    def mark_seen(self, msg_id):

        try:
            msg = Message.objects.get(id=msg_id)
            msg.is_seen = True
            msg.save()
        except Message.DoesNotExist:
            pass

    @database_sync_to_async
    def get_last_seen(self, user_id):

        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(id=user_id)
            if user.last_seen:
                return user.last_seen.isoformat()
        except User.DoesNotExist:
            pass

        return None