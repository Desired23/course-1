from django.db import migrations
from decimal import Decimal, InvalidOperation


def backfill_retail_snapshot(apps, schema_editor):
    InstructorEarning = apps.get_model('instructor_earnings', 'InstructorEarning')
    legacy = InstructorEarning.objects.filter(
        payment__isnull=False,
        platform_commission_rate__isnull=True,
    ).exclude(amount=None)

    for earning in legacy:
        try:
            amount = Decimal(str(earning.amount))
            net = Decimal(str(earning.net_amount or 0))
            if amount <= 0:
                continue
            platform_rate = ((amount - net) / amount * Decimal('100')).quantize(Decimal('0.01'))
            share_rate = (net / amount * Decimal('100')).quantize(Decimal('0.01'))
            earning.platform_commission_rate = platform_rate
            earning.instructor_share_rate = share_rate
            earning.save(update_fields=['platform_commission_rate', 'instructor_share_rate'])
        except (InvalidOperation, ZeroDivisionError):
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_earnings', '0012_snapshot_fields_and_period'),
    ]

    operations = [
        migrations.RunPython(backfill_retail_snapshot, migrations.RunPython.noop),
    ]
