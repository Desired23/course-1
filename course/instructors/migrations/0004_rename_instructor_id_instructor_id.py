

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('instructors', '0003_rename_create_at_instructor_created_at_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='instructor',
            old_name='instructor_id',
            new_name='id',
        ),
    ]
