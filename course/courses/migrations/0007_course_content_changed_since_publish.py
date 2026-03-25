from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0006_course_learning_objectives_course_promotional_video_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='content_changed_since_publish',
            field=models.BooleanField(default=False),
        ),
    ]
