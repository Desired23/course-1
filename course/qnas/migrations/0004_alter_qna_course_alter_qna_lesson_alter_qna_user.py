

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('lessons', '0004_alter_lesson_coursemodule'),
        ('qnas', '0003_rename_qna_id_qna_id_remove_qna_course_id_and_more'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='qna',
            name='course',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_name='qna_course', to='courses.course'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='qna',
            name='lesson',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_name='qna_lesson', to='lessons.lesson'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='qna',
            name='user',
            field=models.ForeignKey(db_column='user_id', default=0, on_delete=django.db.models.deletion.CASCADE, related_name='qna_user', to='users.user'),
            preserve_default=False,
        ),
    ]
