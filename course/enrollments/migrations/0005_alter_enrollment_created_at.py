

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0004_alter_enrollment_created_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enrollment',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
