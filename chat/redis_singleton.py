import redis
from django.conf import settings


class ActiveUsersData:
    __instance = None

    def __init__(self):
        self.__redis_instance = redis.StrictRedis(host=settings.REDIS_HOST,
                                                  port=settings.REDIS_PORT, db=0)
        if ActiveUsersData.__instance is None:
            ActiveUsersData.__instance = self

    @staticmethod
    def get_instance():
        if ActiveUsersData.__instance is None:
            ActiveUsersData()
        return ActiveUsersData.__instance

    def add_active_user(self, username):
        self.__redis_instance.lpush('active_users', username)

    def add_active_chat_user(self, username):
        self.__redis_instance.lpush('active_chat_users', username)
