from rest_framework import serializers

from django.contrib.auth import get_user_model

from .models import Conversation, Message, Call, Notification

User = get_user_model()


class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class ConversationSerializer(serializers.ModelSerializer):
    participants = SimpleUserSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "participants", "created_at"]


class ConversationCreateSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True
    )

    class Meta:
        model = Conversation
        fields = ["id", "participants"]


class MessageSerializer(serializers.ModelSerializer):
    sender = SimpleUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "message_type",
            "text",
            "file",
            "created_at",
            "is_delivered",
            "is_seen"
        ]
        read_only_fields = ["id", "sender", "created_at", "is_delivered", "is_seen"]


class CallSerializer(serializers.ModelSerializer):
    caller = SimpleUserSerializer(read_only=True)
    receiver = SimpleUserSerializer(read_only=True)

    class Meta:
        model = Call
        fields = [
            "id",
            "caller",
            "receiver",
            "call_type",
            "status",
            "started_at",
            "ended_at",
            "created_at"
        ]
        read_only_fields = ["id", "caller", "created_at"]


class CallCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Call
        fields = [
            "id",
            "receiver",
            "call_type"
        ]

        read_only_fields = ["id"]


class NotificationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "body",
            "related_message",
            "related_call",
            "is_read",
            "created_at"
        ]
        read_only_fields = ["id", "created_at"]
