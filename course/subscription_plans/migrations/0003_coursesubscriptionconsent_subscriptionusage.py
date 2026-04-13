

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('enrollments', '0008_enrollment_source_enrollment_subscription'),
        ('subscription_plans', '0002_plancourse_added_reason_plancourse_removed_at_and_more'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='CourseSubscriptionConsent',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('consent_status', models.CharField(choices=[('opted_in', 'Opted In'), ('opted_out', 'Opted Out')], default='opted_out', max_length=20)),
                ('note', models.TextField(blank=True, null=True)),
                ('consented_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('course', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='subscription_consent', to='courses.course')),
                ('instructor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='course_subscription_consents', to='users.user')),
            ],
            options={
                'db_table': 'course_subscription_consents',
            },
        ),
        migrations.CreateModel(
            name='SubscriptionUsage',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('usage_type', models.CharField(choices=[('course_access', 'Course Access'), ('lesson_access', 'Lesson Access')], default='course_access', max_length=20)),
                ('usage_date', models.DateField(auto_now_add=True)),
                ('access_count', models.IntegerField(default=1)),
                ('consumed_minutes', models.IntegerField(default=0)),
                ('last_accessed_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscription_usages', to='courses.course')),
                ('enrollment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subscription_usages', to='enrollments.enrollment')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscription_usages', to='users.user')),
                ('user_subscription', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usages', to='subscription_plans.usersubscription')),
            ],
            options={
                'db_table': 'subscription_usages',
                'unique_together': {('user_subscription', 'user', 'course', 'usage_type', 'usage_date')},
            },
        ),
    ]
