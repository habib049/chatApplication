from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    sender = serializers.CharField(max_length=100)
    receiver = serializers.CharField(max_length=100)
    content = serializers.CharField()
    timestamp = serializers.DateTimeField()
    deleted = serializers.BooleanField()

