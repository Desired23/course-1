

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='sender_id',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sent_notifications', to='users.user'),
        ),
    ]
