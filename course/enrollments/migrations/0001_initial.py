

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('courses', '0001_initial'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='Enrollment',
            fields=[
                ('enrollment_id', models.AutoField(primary_key=True, serialize=False)),
                ('enrollment_date', models.DateTimeField(blank=True, null=True)),
                ('expiry_date', models.DateTimeField(blank=True, null=True)),
                ('completion_date', models.DateTimeField(blank=True, null=True)),
                ('progress', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('status', models.CharField(choices=[('active', 'Active'), ('complete', 'Complete'), ('expired', 'Expired'), ('cancelled', 'Cancelled')], default='active', max_length=20)),
                ('certificate', models.CharField(blank=True, max_length=255, null=True)),
                ('certificate_issue_date', models.DateTimeField(blank=True, null=True)),
                ('last_access_date', models.DateTimeField(blank=True, null=True)),
                ('course_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollment_course', to='courses.course')),
                ('user_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollment_user', to='users.user')),
            ],
            options={
                'db_table': 'Enrollments',
                'constraints': [models.UniqueConstraint(fields=('user_id', 'course_id'), name='unique_enrollment')],
            },
        ),
    ]
