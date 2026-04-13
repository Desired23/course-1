

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('coursemodules', '0004_rename_module_id_coursemodule_id_and_more'),
        ('lessons', '0002_lesson_deleted_at_lesson_deleted_by_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='lesson',
            old_name='lesson_id',
            new_name='id',
        ),
        migrations.RemoveField(
            model_name='lesson',
            name='coursemodule_id',
        ),
        migrations.AddField(
            model_name='lesson',
            name='coursemodule',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='lessons', to='coursemodules.coursemodule'),
        ),
    ]
