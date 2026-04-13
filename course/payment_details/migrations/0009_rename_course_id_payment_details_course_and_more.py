

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('payment_details', '0008_payment_details_created_at_and_more'),
        ('payments', '0004_rename_payment_id_payment_id_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='payment_details',
            old_name='course_id',
            new_name='course',
        ),
        migrations.RenameField(
            model_name='payment_details',
            old_name='payment_id',
            new_name='payment',
        ),
        migrations.RenameField(
            model_name='payment_details',
            old_name='promotion_id',
            new_name='promotion',
        ),
        migrations.AlterUniqueTogether(
            name='payment_details',
            unique_together={('payment', 'course')},
        ),
    ]
