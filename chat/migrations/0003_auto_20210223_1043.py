# Generated by Django 3.1.7 on 2021-02-23 05:43

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0002_auto_20210223_1043'),
    ]

    operations = [
        migrations.AlterField(
            model_name='message',
            name='room',
            field=models.ForeignKey(on_delete=django.db.models.deletion.DO_NOTHING, related_name='messages', to='chat.room'),
        ),
    ]
