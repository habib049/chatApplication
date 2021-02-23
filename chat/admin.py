from django.contrib import admin

from .models import Room, Message


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'friend', 'timestamp']


@admin.register(Message)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['sender', 'receiver', 'room', 'content', 'timestamp']
