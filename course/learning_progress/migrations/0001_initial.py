

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
            name='LearningProgress',
            fields=[
                ('progress_id', models.AutoField(primary_key=True, serialize=False)),
                ('progress', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('last_accessed', models.DateTimeField(auto_now=True)),
                ('status', models.CharField(choices=[('progress', 'progress'), ('completed', 'completed'), ('pending', 'pending')], default='pending', max_length=20)),
                ('start_time', models.DateTimeField(blank=True, null=True)),
                ('completion_time', models.DateTimeField(blank=True, null=True)),
                ('time_spent', models.IntegerField(blank=True, null=True)),
                ('last_position', models.IntegerField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('enrollment_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='learning_progress', to='enrollments.enrollment')),
                ('lesson_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='learning_progress_lesson', to='lessons.lesson')),
            ],
            options={
                'db_table': 'LearningProgress',
                'constraints': [models.UniqueConstraint(fields=('enrollment_id', 'lesson_id'), name='unique_learning_progress')],
            },
        ),
    ]
