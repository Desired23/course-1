

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('enrollments', '0001_initial'),
        ('lessons', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='QuizResult',
            fields=[
                ('quiz_result_id', models.AutoField(primary_key=True, serialize=False)),
                ('start_time', models.DateTimeField(blank=True, null=True)),
                ('submit_time', models.DateTimeField(blank=True, null=True)),
                ('time_taken', models.IntegerField(blank=True, null=True)),
                ('total_questions', models.IntegerField(blank=True, null=True)),
                ('corret_answers', models.IntegerField(blank=True, null=True)),
                ('total_points', models.IntegerField(blank=True, null=True)),
                ('score', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('answers', models.JSONField(blank=True, null=True)),
                ('passed', models.BooleanField(default=False)),
                ('attempt', models.IntegerField(default=1)),
                ('Enrollment_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_result_enrollment', to='enrollments.enrollment')),
                ('Lesson_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_result_lesson', to='lessons.lesson')),
            ],
            options={
                'db_table': 'QuizResult',
                'constraints': [models.UniqueConstraint(fields=('Enrollment_id', 'Lesson_id'), name='unique_quiz_result')],
            },
        ),
    ]
