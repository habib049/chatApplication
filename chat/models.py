import uuid

from django.db import models
from django.contrib.auth.models import User


class Room(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        User,
        related_name='user_room',
        on_delete=models.CASCADE
    )
    friend = models.ForeignKey(
        User,
        related_name='friend_room',
        on_delete=models.CASCADE
    )
    timestamp = models.DateTimeField(auto_now=True)


class Message(models.Model):
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sender_message'
    )
    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='receiver_message'
    )
    room = models.ForeignKey(
        Room,
        related_name='messages',
        on_delete=models.DO_NOTHING,
    )
    content = models.TextField()
    deleted = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
