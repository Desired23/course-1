

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_rename_payment_id_payment_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment',
            name='payment_gateway',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
