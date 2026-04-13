

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payment_details', '0004_alter_payment_details_course_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment_details',
            name='is_refunded',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='refund_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='refund_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment_details',
            name='refund_reason',
            field=models.TextField(blank=True, null=True),
        ),
    ]
