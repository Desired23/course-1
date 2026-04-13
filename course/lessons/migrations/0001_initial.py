

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('coursemodules', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Lesson',
            fields=[
                ('lesson_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('content_type', models.CharField(choices=[('video', 'Video'), ('text', 'Text'), ('quiz', 'Quiz'), ('assignment', 'Assignment'), ('file', 'File'), ('link', 'Link')], max_length=20)),
                ('content', models.TextField(blank=True, null=True)),
                ('video_url', models.CharField(blank=True, max_length=255, null=True)),
                ('file_path', models.CharField(blank=True, max_length=255, null=True)),
                ('duration', models.IntegerField(blank=True, null=True)),
                ('is_free', models.BooleanField(default=False)),
                ('order', models.IntegerField()),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('published', 'Published')], default='draft', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('coursemodule_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lessons', to='coursemodules.coursemodule')),
            ],
            options={
                'ordering': ['order'],
            },
        ),
    ]
