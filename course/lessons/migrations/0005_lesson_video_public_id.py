

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lessons', '0004_alter_lesson_coursemodule'),
    ]

    operations = [
        migrations.AddField(
            model_name='lesson',
            name='video_public_id',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
