from django.urls import path, re_path
from .consumers import ChatConsumer

websocket_urls = [
    re_path(r'^ws/chat/(?P<friendname>[^/]+)/$', ChatConsumer.as_asgi()),
]
