

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('courses', '0002_alter_course_instructor_id'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='Forum',
            fields=[
                ('forum_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('active', 'active'), ('archived', 'archived'), ('deleted', 'deleted')], default='archived', max_length=10)),
                ('course_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='forums_course', to='courses.course')),
                ('user_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='forums_user', to='users.user')),
            ],
            options={
                'db_table': 'Forums',
            },
        ),
    ]
