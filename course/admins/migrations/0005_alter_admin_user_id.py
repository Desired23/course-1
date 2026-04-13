

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admins', '0004_alter_admin_user_id'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='admin',
            name='user_id',
            field=models.OneToOneField(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='admin', to='users.user'),
        ),
    ]
