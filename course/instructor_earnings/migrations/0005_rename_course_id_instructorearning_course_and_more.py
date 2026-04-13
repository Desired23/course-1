

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('instructor_earnings', '0004_instructorearning_created_at_and_more'),
        ('instructors', '0004_rename_instructor_id_instructor_id'),
        ('payments', '0004_rename_payment_id_payment_id_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='instructorearning',
            old_name='course_id',
            new_name='course',
        ),
        migrations.RenameField(
            model_name='instructorearning',
            old_name='earning_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='instructorearning',
            old_name='instructor_id',
            new_name='instructor',
        ),
        migrations.RenameField(
            model_name='instructorearning',
            old_name='instructor_payout_id',
            new_name='instructor_payout',
        ),
        migrations.RenameField(
            model_name='instructorearning',
            old_name='payment_id',
            new_name='payment',
        ),
        migrations.RenameIndex(
            model_name='instructorearning',
            new_name='InstructorE_instruc_709b79_idx',
            old_name='InstructorE_instruc_b4a195_idx',
        ),
        migrations.RenameIndex(
            model_name='instructorearning',
            new_name='InstructorE_course__9ce49e_idx',
            old_name='InstructorE_course__1df5fd_idx',
        ),
        migrations.AlterUniqueTogether(
            name='instructorearning',
            unique_together={('payment', 'course', 'instructor')},
        ),
    ]
