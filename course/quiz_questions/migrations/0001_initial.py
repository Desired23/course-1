

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('lessons', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='QuizQuestion',
            fields=[
                ('question_id', models.AutoField(primary_key=True, serialize=False)),
                ('question_text', models.TextField()),
                ('question_type', models.CharField(choices=[('multiple', 'multiple'), ('truefalse', 'true/false'), ('short', 'short'), ('essay', 'Essay')], max_length=20)),
                ('options', models.JSONField(blank=True, null=True)),
                ('correct_answer', models.TextField()),
                ('points', models.IntegerField(default=1)),
                ('explanation', models.TextField(blank=True, null=True)),
                ('order_number', models.IntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('lesson_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_question_lesson', to='lessons.lesson')),
            ],
            options={
                'db_table': 'QuizQuestions',
            },
        ),
    ]
