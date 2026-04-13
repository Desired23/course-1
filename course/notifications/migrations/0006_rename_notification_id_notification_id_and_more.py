

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0005_notification_deleted_at_notification_deleted_by_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='notification',
            old_name='notification_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='notification',
            old_name='user_id',
            new_name='user',
        ),
    ]
