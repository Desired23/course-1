from django.db import migrations, models
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('subscription_plans', '0006_subscriptionplan_badge_text_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptionplan',
            name='yearly_discount_percent',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Percent discount when user pays yearly, e.g. 15 = 15%', max_digits=5),
        ),
    ]
