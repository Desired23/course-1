from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0007_course_content_changed_since_publish'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='prerequisites',
            field=models.JSONField(blank=True, default=list, help_text='Danh sách tiên quyết'),
        ),
        migrations.AddField(
            model_name='course',
            name='skills_taught',
            field=models.JSONField(blank=True, default=list, help_text='Danh sách kỹ năng đầu ra'),
        ),
    ]
