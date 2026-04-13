

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payment_details', '0010_alter_payment_details_refund_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment_details',
            name='refund_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending approval'),
                    ('processing', 'Refund processing'),
                    ('approved', 'Approved - waiting for refund'),
                    ('success', 'Refunded successfully'),
                    ('rejected', 'Rejected'),
                    ('failed', 'Refund failed'),
                    ('cancelled', 'Cancelled by user'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='gateway_attempt_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='internal_note',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='last_gateway_attempt_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='last_gateway_error',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='next_retry_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='processing_lock_token',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='refund_timeline',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
