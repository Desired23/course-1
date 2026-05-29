from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0010_alter_enrollment_course'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enrollment',
            name='source',
            field=models.CharField(
                choices=[('purchase', 'Purchase'), ('subscription', 'Subscription'), ('granted', 'Granted')],
                default='purchase',
                max_length=20,
            ),
        ),
    ]
