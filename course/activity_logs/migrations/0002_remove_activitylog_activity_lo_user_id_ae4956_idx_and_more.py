

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logs', '0001_initial'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='activitylog',
            name='activity_lo_user_id_ae4956_idx',
        ),
        migrations.RenameField(
            model_name='activitylog',
            old_name='log_id',
            new_name='id',
        ),
        migrations.RemoveField(
            model_name='activitylog',
            name='user_id',
        ),
        migrations.AddField(
            model_name='activitylog',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activity_logs', to='users.user'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['user'], name='activity_lo_user_id_072db3_idx'),
        ),
    ]
