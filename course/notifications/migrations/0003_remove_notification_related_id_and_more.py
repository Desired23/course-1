

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_notification_sender_id'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='notification',
            name='related_id',
        ),
        migrations.RemoveField(
            model_name='notification',
            name='sender_id',
        ),
        migrations.AddField(
            model_name='notification',
            name='notification_code',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
