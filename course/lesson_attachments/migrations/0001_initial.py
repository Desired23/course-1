

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('lessons', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='LessonAttachment',
            fields=[
                ('attachment_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(blank=True, max_length=255, null=True)),
                ('file_path', models.CharField(max_length=255)),
                ('file_type', models.CharField(blank=True, max_length=50, null=True)),
                ('file_size', models.IntegerField(blank=True, null=True)),
                ('download_count', models.IntegerField(default=0)),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('lesson_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='lessons.lesson')),
            ],
            options={
                'db_table': 'LessonAttachments',
            },
        ),
    ]
