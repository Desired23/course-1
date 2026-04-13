

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lessons', '0005_lesson_video_public_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lesson',
            name='content_type',
            field=models.CharField(
                choices=[
                    ('video', 'Video'),
                    ('text', 'Text'),
                    ('quiz', 'Quiz'),
                    ('code', 'Code'),
                    ('assignment', 'Assignment'),
                    ('file', 'File'),
                    ('link', 'Link'),
                ],
                max_length=20,
            ),
        ),
    ]

