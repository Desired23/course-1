

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz_results', '0004_alter_quizresult_enrollment_alter_quizresult_lesson'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='quizresult',
            name='corret_answers',
        ),
        migrations.AddField(
            model_name='quizresult',
            name='correct_answers',
            field=models.IntegerField(blank=True, db_column='corret_answers', null=True),
        ),
    ]
