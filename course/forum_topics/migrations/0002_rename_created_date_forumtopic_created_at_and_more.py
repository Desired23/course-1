

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forum_topics', '0001_initial'),
        ('users', '0003_user_deleted_at_user_deleted_by_user_is_deleted_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='forumtopic',
            old_name='created_date',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='forumtopic',
            old_name='updated_date',
            new_name='updated_at',
        ),
        migrations.AddField(
            model_name='forumtopic',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='forumtopic',
            name='deleted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deleted_forum_topics', to='users.user'),
        ),
        migrations.AddField(
            model_name='forumtopic',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
