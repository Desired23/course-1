

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('forums', '__first__'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='ForumTopic',
            fields=[
                ('topic_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('content', models.TextField()),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('views', models.IntegerField(default=0)),
                ('likes', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('active', 'active'), ('locked', 'locked'), ('deleted', 'deleted')], default='locked', max_length=10)),
                ('is_pinned', models.BooleanField(default=False)),
                ('forum_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='topics_forum', to='forums.forum')),
                ('user_id', models.ForeignKey(db_column='user_id', on_delete=django.db.models.deletion.CASCADE, related_name='topics_user', to='users.user')),
            ],
            options={
                'db_table': 'ForumTopics',
            },
        ),
    ]
