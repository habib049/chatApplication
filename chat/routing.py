from django.urls import path, re_path
from .consumers import ChatConsumer, NotificationConsumer

websocket_urls = [
    # path('ws/notification/', NotificationConsumer.as_asgi()),
    re_path(r'^ws/notification/$', NotificationConsumer.as_asgi()),
    re_path(r'^ws/chat/(?P<friendname>[^/]+)/$', ChatConsumer.as_asgi()),

]
