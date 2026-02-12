from django.urls import re_path

from .consumers.chat_consumers import PrivateChatConsumer
from .consumers.call_consumer import CallConsumer


websocket_urlpatterns = [
    re_path(r"ws/chat/$", PrivateChatConsumer.as_asgi()),
    re_path(r"ws/call/$", CallConsumer.as_asgi()),
]
