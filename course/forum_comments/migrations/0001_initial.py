

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('forum_topics', '__first__'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='ForumComment',
            fields=[
                ('comment_id', models.AutoField(primary_key=True, serialize=False)),
                ('content', models.TextField()),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('likes', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('active', 'active'), ('deleted', 'deleted')], default='aactive', max_length=10)),
                ('is_best_answer', models.BooleanField(default=False)),
                ('parent_comment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='replies', to='forum_comments.forumcomment')),
                ('topic_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments_topic', to='forum_topics.forumtopic')),
                ('user_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments_user', to='users.user')),
            ],
            options={
                'db_table': 'ForumComments',
            },
        ),
    ]
