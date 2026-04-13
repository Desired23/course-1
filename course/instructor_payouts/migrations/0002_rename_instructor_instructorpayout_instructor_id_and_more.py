

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_payouts', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='instructorpayout',
            old_name='instructor',
            new_name='instructor_id',
        ),
        migrations.AlterField(
            model_name='instructorpayout',
            name='status',
            field=models.CharField(choices=[('pending', 'pending'), ('processed', 'processed'), ('cancelled', 'cancelled'), ('failed', 'failed')], default='pending', max_length=20),
        ),
    ]
