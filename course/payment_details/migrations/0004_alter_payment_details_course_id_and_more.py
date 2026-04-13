

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_alter_course_instructor_id'),
        ('payment_details', '0003_alter_payment_details_course_id_and_more'),
        ('payments', '__first__'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment_details',
            name='course_id',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_details', to='courses.course'),
        ),
        migrations.AlterField(
            model_name='payment_details',
            name='payment_id',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_details', to='payments.payment'),
        ),
    ]
