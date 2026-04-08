from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('courses', '0008_course_prerequisites_course_skills_taught'),
        ('users', '0006_usersettings'),
    ]

    operations = [
        migrations.CreateModel(
            name='LearningPath',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('goal_text', models.TextField()),
                ('summary', models.TextField(blank=True, default='')),
                ('estimated_weeks', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='learning_paths', to='users.user')),
            ],
            options={
                'db_table': 'LearningPaths',
                'ordering': ['-updated_at', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PathConversation',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('messages', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('path', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='conversation', to='learning_paths.learningpath')),
            ],
            options={
                'db_table': 'PathConversations',
            },
        ),
        migrations.CreateModel(
            name='LearningPathItem',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('order', models.PositiveIntegerField()),
                ('reason', models.TextField()),
                ('is_skippable', models.BooleanField(default=False)),
                ('skippable_reason', models.TextField(blank=True, default='')),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='learning_path_items', to='courses.course')),
                ('path', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='learning_paths.learningpath')),
            ],
            options={
                'db_table': 'LearningPathItems',
                'ordering': ['order', 'id'],
                'unique_together': {('path', 'order'), ('path', 'course')},
            },
        ),
    ]
