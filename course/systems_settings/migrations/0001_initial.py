

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('admins', '0003_alter_admin_user_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='SystemsSetting',
            fields=[
                ('setting_id', models.AutoField(primary_key=True, serialize=False)),
                ('setting_group', models.CharField(max_length=100)),
                ('setting_key', models.CharField(max_length=100, unique=True)),
                ('setting_value', models.TextField()),
                ('description', models.CharField(max_length=255)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('admin_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='settings_admin', to='admins.admin')),
            ],
            options={
                'db_table': 'SystemsSettings',
            },
        ),
    ]
