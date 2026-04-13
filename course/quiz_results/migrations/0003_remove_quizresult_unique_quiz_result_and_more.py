

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0004_remove_enrollment_unique_enrollment_and_more'),
        ('lessons', '0003_rename_lesson_id_lesson_id_and_more'),
        ('quiz_results', '0002_quizresult_created_at_quizresult_deleted_at_and_more'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='quizresult',
            name='unique_quiz_result',
        ),
        migrations.RenameField(
            model_name='quizresult',
            old_name='quiz_result_id',
            new_name='id',
        ),
        migrations.RemoveField(
            model_name='quizresult',
            name='Enrollment_id',
        ),
        migrations.RemoveField(
            model_name='quizresult',
            name='Lesson_id',
        ),
        migrations.AddField(
            model_name='quizresult',
            name='enrollment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quiz_result_enrollment', to='enrollments.enrollment'),
        ),
        migrations.AddField(
            model_name='quizresult',
            name='lesson',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quiz_result_lesson', to='lessons.lesson'),
        ),
        migrations.AddConstraint(
            model_name='quizresult',
            constraint=models.UniqueConstraint(fields=('enrollment', 'lesson'), name='unique_quiz_result'),
        ),
    ]
