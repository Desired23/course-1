

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lessons', '0004_alter_lesson_coursemodule'),
        ('quiz_questions', '0003_rename_question_id_quizquestion_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='quizquestion',
            name='lesson',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_name='quiz_question_lesson', to='lessons.lesson'),
            preserve_default=False,
        ),
    ]
