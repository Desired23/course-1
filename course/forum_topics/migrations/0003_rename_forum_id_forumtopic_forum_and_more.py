

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('forum_topics', '0002_rename_created_date_forumtopic_created_at_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='forumtopic',
            old_name='forum_id',
            new_name='forum',
        ),
        migrations.RenameField(
            model_name='forumtopic',
            old_name='topic_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='forumtopic',
            old_name='user_id',
            new_name='user',
        ),
    ]
