

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0008_enrollment_source_enrollment_subscription'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enrollment',
            name='status',
            field=models.CharField(choices=[('active', 'Active'), ('complete', 'Complete'), ('expired', 'Expired'), ('cancelled', 'Cancelled'), ('suspended', 'Suspended')], default='active', max_length=20),
        ),
    ]
