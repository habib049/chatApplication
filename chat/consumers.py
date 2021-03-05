import json
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Room, Message





class ChatConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_group_name = None
        self.friend_name = None
        self.user = None
        self.room = None

    def connect(self):

        redis_instance.lpush('active_chat_users', "user 1")
        redis_instance.lpush('active_chat_users', "user 2")
        redis_instance.lpush('active_chat_users', "user 3")

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
        # storing data on redis
        # print("redis user exists : ", redis_instance.exists('active_chat_users'))
        #
        # redis_instance.lpush('active_chat_users', self.user.username)
        self.accept()

        while redis_instance.llen('active_chat_users') != 0:
            print(redis_instance.lpop('active_chat_users'))

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )
        # removing the user from the active users on disconnect
        redis_instance.lrem('active_chat_users', count=0, value=self.user.username)

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
            'sender': message.sender.username,
            'receiver': message.receiver.username,
            'content': message.content,
            'deleted': message.deleted,
            'timestamp': str(message.timestamp)
        }
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'send_message',
                'messages': message_data
            }
        )

    def send_message(self, event):
        self.send(text_data=json.dumps(event['messages']))


class NotificationConsumer(WebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_group_name = None
        self.user = None

    def connect(self):
        self.user = self.scope["user"].username
        self.room_group_name = self.user
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )

        redis_instance.lpush('active_users', self.user)

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

    def notify(self, event):
        print(event)
        self.send(text_data=json.dumps(event['notification']))
