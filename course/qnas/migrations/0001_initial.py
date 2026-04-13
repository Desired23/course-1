

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('courses', '0002_alter_course_instructor_id'),
        ('lessons', '0001_initial'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='QnA',
            fields=[
                ('qna_id', models.AutoField(primary_key=True, serialize=False)),
                ('question', models.TextField()),
                ('asked_date', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Answered', 'Answered'), ('Closed', 'Closed')], default='Pending', max_length=10)),
                ('views', models.IntegerField(default=0)),
                ('course_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='qna_course', to='courses.course')),
                ('lesson_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='qna_lesson', to='lessons.lesson')),
                ('user_id', models.ForeignKey(db_column='user_id', on_delete=django.db.models.deletion.CASCADE, related_name='qna_user', to='users.user')),
            ],
            options={
                'db_table': 'QnA',
            },
        ),
    ]
