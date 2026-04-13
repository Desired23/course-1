

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lesson_attachments', '0002_rename_created_date_lessonattachment_created_at_and_more'),
        ('lessons', '0003_rename_lesson_id_lesson_id_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='lessonattachment',
            old_name='attachment_id',
            new_name='id',
        ),
        migrations.RemoveField(
            model_name='lessonattachment',
            name='lesson_id',
        ),
        migrations.AddField(
            model_name='lessonattachment',
            name='lesson',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='lessons.lesson'),
        ),
    ]
