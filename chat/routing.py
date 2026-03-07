# chat/routing.py
from django.urls import re_path
from .consumers.RealtimeConsumer import RealtimeConsumer

websocket_urlpatterns = [
    re_path(r"ws/realtime/$", RealtimeConsumer.as_asgi()),
]  