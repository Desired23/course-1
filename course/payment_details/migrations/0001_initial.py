

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('courses', '0001_initial'),
        ('payments', '__first__'),
        ('promotions', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment_Details',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('discount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('final_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('course_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='courses.course')),
                ('payment_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='details', to='payments.payment')),
                ('promotion_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_details', to='promotions.promotion')),
            ],
            options={
                'db_table': 'payment_details',
                'unique_together': {('payment_id', 'course_id')},
            },
        ),
    ]
