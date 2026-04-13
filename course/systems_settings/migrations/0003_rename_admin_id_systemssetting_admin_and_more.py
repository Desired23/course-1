

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('systems_settings', '0002_rename_updated_date_systemssetting_updated_at_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='systemssetting',
            old_name='admin_id',
            new_name='admin',
        ),
        migrations.RenameField(
            model_name='systemssetting',
            old_name='setting_id',
            new_name='id',
        ),
    ]
