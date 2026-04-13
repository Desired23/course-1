

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('enrollments', '0004_remove_enrollment_unique_enrollment_and_more'),
        ('learning_progress', '0004_remove_learningprogress_unique_learning_progress_and_more'),
        ('lessons', '0003_rename_lesson_id_lesson_id_and_more'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='learningprogress',
            name='unique_learning_progress',
        ),
        migrations.RenameField(
            model_name='learningprogress',
            old_name='completion_time',
            new_name='completion_date',
        ),
        migrations.RenameField(
            model_name='learningprogress',
            old_name='progress',
            new_name='progress_percentage',
        ),
        migrations.AddField(
            model_name='learningprogress',
            name='is_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddConstraint(
            model_name='learningprogress',
            constraint=models.UniqueConstraint(fields=('user', 'lesson'), name='unique_user_lesson_progress'),
        ),
    ]
