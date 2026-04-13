

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_payment_deleted_at_payment_deleted_by_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='payment',
            old_name='payment_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='payment',
            old_name='promotion_id',
            new_name='promotion',
        ),
        migrations.RenameField(
            model_name='payment',
            old_name='user_id',
            new_name='user',
        ),
    ]
