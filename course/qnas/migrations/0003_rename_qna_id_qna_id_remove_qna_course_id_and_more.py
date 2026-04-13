

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('lessons', '0003_rename_lesson_id_lesson_id_and_more'),
        ('qnas', '0002_rename_asked_date_qna_created_at_qna_deleted_at_and_more'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.RenameField(
            model_name='qna',
            old_name='qna_id',
            new_name='id',
        ),
        migrations.RemoveField(
            model_name='qna',
            name='course_id',
        ),
        migrations.RemoveField(
            model_name='qna',
            name='lesson_id',
        ),
        migrations.RemoveField(
            model_name='qna',
            name='user_id',
        ),
        migrations.AddField(
            model_name='qna',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='qna_course', to='courses.course'),
        ),
        migrations.AddField(
            model_name='qna',
            name='lesson',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='qna_lesson', to='lessons.lesson'),
        ),
        migrations.AddField(
            model_name='qna',
            name='user',
            field=models.ForeignKey(blank=True, db_column='user_id', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='qna_user', to='users.user'),
        ),
    ]
