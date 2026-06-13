from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0009_remove_course_prerequisites_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='admin_hidden',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='course',
            name='is_hard_blocked',
            field=models.BooleanField(default=False),
        ),
    ]
