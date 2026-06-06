from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_backfill_roles_from_user_type'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='user_type',
        ),
    ]
