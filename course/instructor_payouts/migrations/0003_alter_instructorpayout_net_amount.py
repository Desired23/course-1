

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_payouts', '0002_rename_instructor_instructorpayout_instructor_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='instructorpayout',
            name='net_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True),
        ),
    ]
