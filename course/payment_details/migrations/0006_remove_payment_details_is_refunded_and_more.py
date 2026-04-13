

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payment_details', '0005_payment_details_is_refunded_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='payment_details',
            name='is_refunded',
        ),
        migrations.AddField(
            model_name='payment_details',
            name='refund_request_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='refund_response_code',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='refund_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('success', 'Success'), ('failed', 'Failed')], default='pending', max_length=20),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='refund_transaction_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
