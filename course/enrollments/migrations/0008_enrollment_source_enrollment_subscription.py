

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0007_enrollment_payment'),
        ('subscription_plans', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollment',
            name='source',
            field=models.CharField(choices=[('purchase', 'Purchase'), ('subscription', 'Subscription')], default='purchase', max_length=20),
        ),
        migrations.AddField(
            model_name='enrollment',
            name='subscription',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='enrollments', to='subscription_plans.usersubscription'),
        ),
    ]
