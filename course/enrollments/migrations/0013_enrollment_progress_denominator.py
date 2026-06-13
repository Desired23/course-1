from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0012_alter_enrollment_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollment',
            name='progress_denominator',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
