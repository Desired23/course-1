from datetime import timedelta
from decimal import Decimal

from django.db import migrations, models


def infer_payment_billing_cycles(apps, schema_editor):
    Payment = apps.get_model('payments', 'Payment')
    UserSubscription = apps.get_model('subscription_plans', 'UserSubscription')

    subscription_payments = (
        Payment.objects.filter(
            payment_type='subscription',
            subscription_plan__isnull=False,
        )
        .select_related('subscription_plan')
    )

    for payment in subscription_payments.iterator():
        plan = payment.subscription_plan
        base_monthly_price = Decimal(plan.discount_price if plan.discount_price else plan.price)
        if base_monthly_price > 0 and payment.amount >= base_monthly_price * Decimal('12'):
            payment.billing_cycle = 'yearly'
        else:
            payment.billing_cycle = 'monthly'
        payment.save(update_fields=['billing_cycle'])

    yearly_subscriptions = (
        UserSubscription.objects.filter(
            payment__payment_type='subscription',
            payment__billing_cycle='yearly',
            end_date__isnull=False,
            is_deleted=False,
        )
        .select_related('payment')
    )
    for subscription in yearly_subscriptions.iterator():
        expected_end_date = subscription.start_date + timedelta(days=365)
        if subscription.end_date < expected_end_date:
            subscription.end_date = expected_end_date
            subscription.save(update_fields=['end_date'])


class Migration(migrations.Migration):

    dependencies = [
        ('subscription_plans', '0013_snapshot_fields_and_period'),
        ('payments', '0010_alter_payment_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='billing_cycle',
            field=models.CharField(
                blank=True,
                choices=[('monthly', 'Monthly'), ('yearly', 'Yearly')],
                max_length=20,
                null=True,
            ),
        ),
        migrations.RunPython(infer_payment_billing_cycles, migrations.RunPython.noop),
    ]
