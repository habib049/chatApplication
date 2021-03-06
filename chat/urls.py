from django.urls import path
from . import views

app_name = 'chat'
urlpatterns = [
    path('', views.Contact.as_view(), name='index_page'),
    path('login', views.LoginView.as_view(), name="user_login"),
    path('registration', views.RegistrationView.as_view(), name="user_registration"),
    path('logout', views.LogoutView.as_view(), name="user_logout"),
    path('fectch-messages', views.fetch_messages, name='fetch_messages'),

]
