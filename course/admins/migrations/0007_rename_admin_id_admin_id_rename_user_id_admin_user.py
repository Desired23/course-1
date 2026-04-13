

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('admins', '0006_admin_deleted_at_admin_deleted_by_admin_is_deleted'),
    ]

    operations = [
        migrations.RenameField(
            model_name='admin',
            old_name='admin_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='admin',
            old_name='user_id',
            new_name='user',
        ),
    ]
