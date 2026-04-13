

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0006_merge_20260204_2116'),
        ('payments', '0004_rename_payment_id_payment_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollment',
            name='payment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='enrollments', to='payments.payment'),
        ),
    ]
