

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0002_enrollment_created_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enrollment',
            name='created_at',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
    ]
