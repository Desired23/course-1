

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('lessons', '0001_initial'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='LessonComment',
            fields=[
                ('comment_id', models.AutoField(primary_key=True, serialize=False)),
                ('content', models.TextField()),
                ('votes', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('lesson_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='lessons.lesson')),
                ('parent_comment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='lesson_comments.lessoncomment')),
                ('user_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lesson_comments', to='users.user')),
            ],
        ),
    ]
