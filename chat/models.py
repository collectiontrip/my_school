import uuid
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(User, related_name="conversations")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.id)
    

class Message(models.Model):

    MESSAGE_TYPE_TEXT = "text"
    MESSAGE_TYPE_IMAGE = "image"
    MESSAGE_TYPE_AUDIO = "audio"
    MESSAGE_TYPE_VIDEO = "video"

    MESSAGE_TYPE_CHOICES = [
       (MESSAGE_TYPE_TEXT, "Text"),
       (MESSAGE_TYPE_IMAGE, "Image"),
       (MESSAGE_TYPE_AUDIO, "Audio"),
       (MESSAGE_TYPE_VIDEO, "Video")
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="send_messages"
    )

    message_type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPE_CHOICES,
        default=MESSAGE_TYPE_TEXT
    )

    text = models.TextField(blank=True, null=True)

    file = models.FileField(
        upload_to="chat_files/",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)


class Call(models.Model):
    CALL_TYPE_AUDIO = "audio"
    CALL_TYPE_VIDEO = "video"

    CALL_TYPE_CHOICES = [
        (CALL_TYPE_AUDIO, "Audio"),
        (CALL_TYPE_VIDEO, "Video")
    ]

    STATUS_INITIATED = "initiated"
    STATUS_RINGING = "ringing"
    STATUS_ACCEPTED = "accepted"
    STATUS_ENDED = "ended"
    STATUS_MISSED = "missed"

    STATUS_CHOICES = [
        (STATUS_INITIATED, "Initiated"),
        (STATUS_RINGING, "Ringing"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_ENDED, "Ended"),
        (STATUS_MISSED, "Missed")
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    caller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="outgoing_calls"
    )

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="incoming_calls"
    )

    call_type = models.CharField(
        max_length=10,
        choices=CALL_TYPE_CHOICES
    )

    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default=STATUS_INITIATED
    )

    started_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Notification(models.Model):
    TYPE_MESSAGE = "message"
    TYPE_CALL = "call"
    TYPE_SYSTEM = "system"


    NOTIFICATION_TYPE_CHOICES = [
        (TYPE_MESSAGE, "Message"),
        (TYPE_CALL, "Call"),
        (TYPE_SYSTEM, "System")
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    notification_type = models.CharField(
        max_length=10,
        choices=NOTIFICATION_TYPE_CHOICES
    )

    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)

    related_message = models.ForeignKey(
        Message,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications"
    )

    related_call = models.ForeignKey(
        Call,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications"
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)