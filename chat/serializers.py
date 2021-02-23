from rest_framework import serializers


class MessageSerializer(serializers.Serializer):
    sender = serializers.CharField(max_length=100)
    receiver = serializers.CharField(max_length=100)
    content = serializers.CharField()
    timestamp = serializers.DateTimeField()
