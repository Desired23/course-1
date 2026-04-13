

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_remove_payment_refund_date_and_more'),
        ('users', '0003_user_deleted_at_user_deleted_by_user_is_deleted_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='deleted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deleted_payments', to='users.user'),
        ),
        migrations.AddField(
            model_name='payment',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
