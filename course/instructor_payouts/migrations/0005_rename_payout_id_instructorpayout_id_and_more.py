

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_payouts', '0004_instructorpayout_created_at_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='instructorpayout',
            old_name='payout_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='instructorpayout',
            old_name='instructor_id',
            new_name='instructor',
        ),
    ]
