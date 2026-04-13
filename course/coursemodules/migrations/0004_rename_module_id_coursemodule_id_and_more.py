

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('coursemodules', '0003_rename_created_date_coursemodule_created_at_and_more'),
        ('courses', '0004_rename_category_id_course_category_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='coursemodule',
            old_name='module_id',
            new_name='id',
        ),
        migrations.RemoveField(
            model_name='coursemodule',
            name='course_id',
        ),
        migrations.AddField(
            model_name='coursemodule',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='modules', to='courses.course'),
        ),
    ]
