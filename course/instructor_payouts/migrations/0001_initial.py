

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('admins', '0004_alter_admin_user_id'),
        ('instructors', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='InstructorPayout',
            fields=[
                ('payout_id', models.AutoField(primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('fee', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('net_amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('payment_method', models.CharField(max_length=100)),
                ('transaction_id', models.CharField(blank=True, max_length=255, null=True)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Processed', 'Processed'), ('Cancelled', 'Cancelled'), ('Failed', 'Failed')], default='Pending', max_length=20)),
                ('request_date', models.DateTimeField(auto_now_add=True)),
                ('processed_date', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('period', models.CharField(max_length=20)),
                ('instructor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payouts', to='instructors.instructor')),
                ('processed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_payouts', to='admins.admin')),
            ],
            options={
                'db_table': 'InstructorPayouts',
                'ordering': ['-request_date'],
            },
        ),
    ]
