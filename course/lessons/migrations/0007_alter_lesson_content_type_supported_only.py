from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lessons', '0006_alter_lesson_content_type_add_code'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lesson',
            name='content_type',
            field=models.CharField(
                choices=[
                    ('video', 'Video'),
                    ('quiz', 'Quiz'),
                    ('code', 'Code'),
                ],
                max_length=20,
            ),
        ),
    ]
