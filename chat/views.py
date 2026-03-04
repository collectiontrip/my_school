from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from rest_framework import mixins, viewsets, permissions, status
from .models import Conversation, Message, Call, Notification
from .serializers import (
    ConversationSerializer,
    ConversationCreateSerializer,
    MessageSerializer,
    CallSerializer,
    CallCreateSerializer,
    NotificationSerializer

)





class ConversationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet

):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).distinct()
    
    def get_serializer_class(self):
        if self.action == "create":
            return ConversationCreateSerializer
        return ConversationSerializer

    def perform_create(self, serializer):
        conversation = serializer.save()
        conversation.participants.add(self.request.user)


class MessageViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(
            conversation__participants=self.request.user
        ).select_related("sender", "conversation").order_by("-created_at")

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        users = message.conversation.participants.exclude(
            id=self.request.user.id
        )

        notification = [
            Notification(
                user=user,
                notification_type=Notification.TYPE_MESSAGE,
                title="New message",
                body=message.text or "media message",
                related_message=message
            )

            for user in users
        ]

        Notification.objects.bulk_create(notification)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        message = self.get_object()

        if request.user not in message.conversation.participants.all():
            return Response(
                {"detail": "Not allowed"},
                status=status.HTTP_403_FORBIDDEN
            )
        message.is_read=True
        message.save(update_fields=["is_read"])

        return Response({"status": "read"})


class CallViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Call.objects.filter(
            Q(caller=self.request.user) |
            Q(receiver=self.request.user)
        ).select_related("caller", "receiver")

    def get_serializer_class(self):
        if self.action == "create":
            return CallCreateSerializer
        return CallSerializer

    def perform_create(self, serializer):
        call = serializer.save(
            caller=self.request.user,
            status=Call.STATUS_INITIATED
        )

        Notification.objects.create(
            user= call.receiver,
            notification_type=Notification.TYPE_CALL,
            title="Incoming call",
            body=f"{call.call_type.capitalize()} call",
            related_call=call
        )

    @action(detail=True, methods=["post"])
    def ringing(self, request, pk=None):
        call = self.get_object()

        if request.user != call.receiver:
            return Response(
                {"detail": "Only receiver can mark ringing"},
                status=status.HTTP_403_FORBIDDEN
            )

        call.status = Call.STATUS_RINGING
        call.save(update_fields=["status"])

        return Response({"status": "ringing"})

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        call = self.get_object()

        if request.user != call.receiver:
            return Response(
                {"detail": "Only receiver can accept call"},
                status=status.HTTP_403_FORBIDDEN
            )

        call.status = Call.STATUS_ACCEPTED
        call.started_at = timezone.now()
        call.save(update_fields=["status", "started_at"])

        return Response({"status": "accepted"})

    @action(detail=True, methods= ["post"])
    def end(self, request, pk=None):
        call = self.get_object()

        if request.user not in [call.caller, call.receiver]:
            return Response(
                {"detail": "Not allowed"},
                status=status.HTTP_403_FORBIDDEN
            )

        call.status = Call.STATUS_ENDED
        call.ended_at = timezone.now()
        call.save(update_fields=["status", "ended_at"])

        return Response({"status": "ended"})

    @action(detail=True, methods=["post"])
    def miss(self, request, pk=None):
        call = self.get_object()

        if request.user not in [call.caller, call.receiver]:
            return Response(
                {"detail": "Not allowed"},
                status=status.HTTP_403_FORBIDDEN
            )

        call.status = Call.STATUS_MISSED
        call.ended_at = timezone.now()
        call.save(update_fields=["status", "ended_at"])

        return Response({"status": "missed"})

class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet
):

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(
            user = self.request.user
        ).order_by("-created_at")

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)

        return Response({"status": "all read"})


