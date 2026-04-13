

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('promotions', '__first__'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('payment_id', models.AutoField(primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('transaction_id', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('payment_date', models.DateTimeField(auto_now_add=True)),
                ('payment_status', models.CharField(choices=[('pending', 'pending'), ('completed', 'completed'), ('failed', 'failed'), ('refunded', 'refunded'), ('cancelled', 'cancelled')], default='pending', max_length=20)),
                ('payment_method', models.CharField(choices=[('vnpay', 'vnpay'), ('momo', 'momo')], default='vnpay', max_length=20)),
                ('refund_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('refund_reason', models.TextField(blank=True, null=True)),
                ('refund_date', models.DateTimeField(blank=True, null=True)),
                ('payment_gateway', models.CharField(max_length=255)),
                ('gateway_response', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('promotion_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments_discount', to='promotions.promotion')),
                ('user_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_user_id', to='users.user')),
            ],
            options={
                'db_table': 'payments',
            },
        ),
    ]
