

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('supports', '0003_rename_admin_id_support_admin_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='support',
            name='priority',
            field=models.CharField(choices=[('low', 'low'), ('medium', 'medium'), ('high', 'high'), ('urgent', 'urgent')], default='medium', max_length=10),
        ),
        migrations.AlterField(
            model_name='support',
            name='status',
            field=models.CharField(choices=[('open', 'open'), ('in_progress', 'in_progress'), ('resolved', 'resolved'), ('closed', 'closed')], default='open', max_length=20),
        ),
    ]
