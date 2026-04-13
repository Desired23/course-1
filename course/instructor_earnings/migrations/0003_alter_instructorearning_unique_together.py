

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_alter_course_instructor_id'),
        ('instructor_earnings', '0002_remove_instructorearning_commission_rate'),
        ('instructors', '0001_initial'),
        ('payments', '__first__'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='instructorearning',
            unique_together={('payment_id', 'course_id', 'instructor_id')},
        ),
    ]
