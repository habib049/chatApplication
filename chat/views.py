from django.db.models import Q, Prefetch
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.shortcuts import render, HttpResponseRedirect, redirect
from django.contrib import messages, auth
from django.urls import reverse_lazy
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from .forms import RegistrationForm, LoginForm
from django.views.generic import CreateView, FormView, RedirectView, ListView
from django.contrib.auth.mixins import LoginRequiredMixin

from django.contrib.auth.models import User
from .models import Message, Room
from datetime import datetime
from .serializers import MessageSerializer


class RegistrationView(CreateView):
    model = User
    form_class = RegistrationForm
    template_name = 'register.html'

    def post(self, request, *args, **kwargs):
        new_user = RegistrationForm(request.POST)
        if new_user.is_valid():
            new_user.save()
            return redirect('chat:user_login')
        return render(request, 'register.html', {'form': new_user})


class LoginView(FormView):
    form_class = LoginForm
    template_name = 'login.html'
    success_url = '/'

    def form_valid(self, form):
        auth.login(self.request, form.get_user())
        return HttpResponseRedirect(self.get_success_url())

    def form_invalid(self, form):
        return self.render_to_response(self.get_context_data(form=form))


class LogoutView(RedirectView):
    url = reverse_lazy('chat:user_login')

    def get(self, request, *args, **kwargs):
        auth.logout(request)
        messages.success(request, 'You are now logged out')
        return super(LogoutView, self).get(request, *args, **kwargs)


def render_messenger(request):
    if request.user.is_authenticated:
        return render(request, 'index.html')
    return redirect('/login')


class Contact(ListView, LoginRequiredMixin):
    model = Message
    paginate_by = 10
    context_object_name = 'contacts'
    template_name = 'index.html'

    def get_queryset(self):
        query = Room.objects.filter(
            Q(user=self.request.user) | Q(friend=self.request.user)
        ).order_by(
            'timestamp'
        ).prefetch_related(
            Prefetch('messages', queryset=Message.objects.order_by(
                'timestamp'
            ))
        )
        return query


def fetch_messages(request):
    if request.is_ajax() and request.method == 'POST':
        sender = request.user
        receiver_name = request.POST.get('friend_name')
        receiver = User.objects.get(username=receiver_name)

        fetched_messages = Message.objects.filter(
            Q(sender=sender, receiver=receiver) |
            Q(sender=receiver, receiver=sender)
        ).order_by(
            'timestamp'
        )

        page = request.POST.get('page', 1)
        paginator = Paginator(fetched_messages, 20)

        try:
            fetched_messages = paginator.page(page)
        except PageNotAnInteger:
            fetched_messages = paginator.page(1)
        except EmptyPage:
            fetched_messages = paginator.page(paginator.num_pages)

        data = {
            'previous_page': fetched_messages.has_previous() and fetched_messages.previous_page_number() or None,
            'next_page': fetched_messages.has_next() and fetched_messages.next_page_number() or None,
        }
        # serializing data
        serialized_messages = MessageSerializer(fetched_messages, many=True)
        return JsonResponse({
            'messages': serialized_messages.data,
            'page_data': data,
            'user': request.user.username,
            'friend': request.POST.get('friend_name'),
        })
