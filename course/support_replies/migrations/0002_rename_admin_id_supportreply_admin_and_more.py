

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support_replies', '0001_initial'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.RenameField(
            model_name='supportreply',
            old_name='admin_id',
            new_name='admin',
        ),
        migrations.RenameField(
            model_name='supportreply',
            old_name='reply_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='supportreply',
            old_name='support_id',
            new_name='support',
        ),
        migrations.RenameField(
            model_name='supportreply',
            old_name='user_id',
            new_name='user',
        ),
        migrations.AddField(
            model_name='supportreply',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supportreply',
            name='deleted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deleted_support_replies', to='users.user'),
        ),
        migrations.AddField(
            model_name='supportreply',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='supportreply',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
