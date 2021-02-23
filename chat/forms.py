from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
import re


class RegistrationForm(UserCreationForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({
            'placeholder': 'Enter username',
            'class': 'form-input'
        })
        self.fields['email'].widget.attrs.update({
            'placeholder': 'Enter email',
            'class': 'form-input'
        })
        self.fields['password1'].widget.attrs.update({
            'placeholder': 'Enter password',
            'class': 'form-input'
        })
        self.fields['password2'].widget.attrs.update({
            'placeholder': 'Enter password again',
            'class': 'form-input'
        })
        self.fields['email'].required = True

        self.__username_expression = re.compile("[a-zA-Z0-9_.-]")

    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput,
    )
    password2 = forms.CharField(
        label="Password Confirmation",
        widget=forms.PasswordInput,
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']
        help_texts = {
            'username': None,
            'password1': None
        }

    def clean_email(self):
        email = self.cleaned_data['email']

        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("Email already exists")

        return email


class LoginForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({
            'placeholder': 'Enter username',
        })
        self.fields['password'].widget.attrs.update({
            'placeholder': 'Enter password',
        })
