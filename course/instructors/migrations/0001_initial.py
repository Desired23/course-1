

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('instructor_levels', '0001_initial'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='Instructor',
            fields=[
                ('instructor_id', models.AutoField(primary_key=True, serialize=False)),
                ('bio', models.TextField(blank=True, null=True)),
                ('specialization', models.CharField(blank=True, max_length=255, null=True)),
                ('qualification', models.CharField(blank=True, max_length=255, null=True)),
                ('experience', models.IntegerField(blank=True, null=True)),
                ('social_links', models.JSONField(blank=True, null=True)),
                ('rating', models.DecimalField(decimal_places=2, default=0, max_digits=3)),
                ('total_students', models.IntegerField(default=0)),
                ('total_courses', models.IntegerField(default=0)),
                ('payment_info', models.JSONField(blank=True, null=True)),
                ('create_at', models.DateTimeField(auto_now_add=True)),
                ('update_at', models.DateTimeField(auto_now=True)),
                ('level', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='instructors', to='instructor_levels.instructorlevel')),
                ('user_id', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='users.user')),
            ],
            options={
                'db_table': 'Instructors',
            },
        ),
    ]
