

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_levels', '0002_instructorlevel_deleted_at_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='instructorlevel',
            old_name='instructor_level_id',
            new_name='id',
        ),
    ]
