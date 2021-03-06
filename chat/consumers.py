import json
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Room, Message
from django_redis import get_redis_connection
from django.core.cache import cache


class ChatConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_group_name = None
        self.friend_name = None
        self.user = None
        self.room = None

    def connect(self):
        self.user = self.scope['user']
        self.friend_name = self.scope['url_route']['kwargs']['friendname']
        # getting receiver object
        friend = User.objects.get(username=self.friend_name)
        # checking room id
        room_object = Room.objects.filter(
            Q(user=self.user, friend=friend)
            | Q(user=friend, friend=self.user)
        )
        if room_object.exists():
            self.room = room_object[0]
        else:
            self.room = Room.objects.create(user=self.user, friend=friend)

        self.room_group_name = 'chat_%s' % str(self.room.id)

        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )

        # adding the user in redis as active chat user
        cache.set(self.user.username, "active_chat_user")
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )
        # removing the user from active chat user
        cache.delete(self.user.username)

    def receive(self, text_data):
        data = json.loads(text_data)
        if data['command'] == 'newMessage':
            self.save_message(data)
        elif data['command'] == 'deleteMessage':
            self.delete_message(data['message'])
        elif data['command'] == 'typing':
            self.user_typing(data['user'], data['message'])
        elif data['command'] == 'stop_typing':
            self.user_stop_typing(data['user'], data['message'])

    def user_typing(self, user, message):
        data = {
            'message_type': 'typing',
            'user': user,
            'message': message
        }
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'send_message',
                'messages': data
            }
        )

    def user_stop_typing(self, user, message):
        data = {
            'message_type': 'stop_typing',
            'user': user,
            'message': message
        }
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'send_message',
                'messages': data
            }
        )

    def delete_message(self, message_id):
        # adding data to database
        message = Message.objects.get(id=message_id)
        message.deleted = True
        message.content = "This message was deleted"
        message.save()

        data = {
            'message_type': 'delete_message',
            'message_id': message_id,
            'message': message.content
        }

        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'send_message',
                'messages': data
            }
        )

    def save_message(self, message_obj):
        message = Message.objects.create(
            sender=User.objects.get(username=message_obj['sender']),
            receiver=User.objects.get(username=message_obj['receiver']),
            room=self.room,
            content=message_obj['message']
        )
        self.send_new_message(message)

    def send_new_message(self, message):
        message_data = {
            'message_type': "message_notification",
            'sender': message.sender.username,
            'receiver': message.receiver.username,
            'content': message.content,
            'deleted': message.deleted,
            'timestamp': str(message.timestamp)
        }

        # sending message to room
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'send_message',
                'messages': message_data
            }
        )

        # checking if receiver is attached with the socket or not
        if cache.__contains__(message.receiver.username):  # if attached

            print("\n\n", cache.get(message.receiver.username), "\n\n")

            if cache.get(message.receiver.username) != 'active_chat_user':
                async_to_sync(self.channel_layer.group_send)(
                    message.receiver.username,
                    {
                        'type': 'notify',
                        'notification': message_data
                    }
                )

    def send_message(self, event):
        self.send(text_data=json.dumps(event['messages']))


class NotificationConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_group_name = None
        self.user = None
        self.redis_connection = get_redis_connection('default')

    def connect(self):
        self.user = self.scope["user"].username
        self.room_group_name = self.user
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )
        # adding the user in redis as active user
        cache.set(self.user, "online")
        self.accept()

    def receive(self, text_data):
        data = json.loads(text_data)
        if data['command'] == 'typing':
            self.user_typing(data['user'], data['friend'], data['message'])
        else:
            self.stop_typing(data['user'], data['friend'], data['message'])

    def user_typing(self, user, friend, message):
        data = {
            'message_type': 'typing',
            'user': user,
            'friend': friend,
            'message': message
        }

        async_to_sync(self.channel_layer.group_send)(
            friend,
            {
                'type': 'notify',
                'notification': data
            }
        )

    def stop_typing(self, user, friend, message):
        data = {
            'message_type': 'stop_typing',
            'user': user,
            'friend': friend,
            'message': message
        }

        async_to_sync(self.channel_layer.group_send)(
            friend,
            {
                'type': 'notify',
                'notification': data
            }
        )

    def disconnect(self, code):
        async_to_sync(self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        ))

        # removing user from redis
        cache.delete(self.user)

    def notify(self, event):
        print(event['notification'])
        self.send(text_data=json.dumps(event['notification']))
