

import django.db.models.deletion
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('subscription_plans', '0001_initial'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='plancourse',
            name='added_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='plancourse',
            name='removed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='plancourse',
            name='removed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='removed_plan_courses', to='users.user'),
        ),
        migrations.AddField(
            model_name='plancourse',
            name='status',
            field=models.CharField(choices=[('active', 'Active'), ('removed', 'Removed')], default='active', max_length=10),
        ),
        migrations.AlterField(
            model_name='subscriptionplan',
            name='duration_days',
            field=models.IntegerField(default=30),
        ),
        migrations.AlterField(
            model_name='subscriptionplan',
            name='instructor_share_percent',
            field=models.DecimalField(decimal_places=2, default=Decimal('60.00'), max_digits=5),
        ),
        migrations.AlterField(
            model_name='subscriptionplan',
            name='max_subscribers',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='usersubscription',
            name='end_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
