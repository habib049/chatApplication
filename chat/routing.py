from django.urls import path
from .consumers import ChatConsumer

websocket_urls = [
    path('ws/chat/<str:friendname>', ChatConsumer.as_asgi())
]
