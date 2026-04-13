

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('enrollments', '0003_enrollment_deleted_at_enrollment_deleted_by_and_more'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='enrollment',
            name='unique_enrollment',
        ),
        migrations.RenameField(
            model_name='enrollment',
            old_name='enrollment_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='enrollment',
            old_name='user_id',
            new_name='user',
        ),
        migrations.RemoveField(
            model_name='enrollment',
            name='course_id',
        ),
        migrations.AddField(
            model_name='enrollment',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='enrollment_course', to='courses.course'),
        ),
        migrations.AddConstraint(
            model_name='enrollment',
            constraint=models.UniqueConstraint(fields=('user', 'course'), name='unique_enrollment'),
        ),
    ]
