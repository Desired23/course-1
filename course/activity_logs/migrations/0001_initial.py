

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('log_id', models.AutoField(primary_key=True, serialize=False)),
                ('action', models.CharField(choices=[('LOGIN', 'Login'), ('LOGOUT', 'Logout'), ('FAILED_LOGIN', 'Failed Login'), ('REGISTER', 'Register'), ('EMAIL_VERIFIED', 'Email Verified'), ('PASSWORD_CHANGED', 'Password Changed'), ('PROFILE_UPDATED', 'Profile Updated'), ('CREATE', 'Create'), ('UPDATE', 'Update'), ('DELETE', 'Delete'), ('PAYMENT_INITIATED', 'Payment Initiated'), ('PAYMENT_SUCCESS', 'Payment Success'), ('PAYMENT_FAILED', 'Payment Failed'), ('REFUND_REQUESTED', 'Refund Requested'), ('REFUND_APPROVED', 'Refund Approved'), ('REFUND_REJECTED', 'Refund Rejected'), ('ENROLL', 'Enroll'), ('VIEW_LESSON', 'View Lesson'), ('COMMENT', 'Comment'), ('REPLY', 'Reply'), ('LIKE_COMMENT', 'Like Comment'), ('DISLIKE_COMMENT', 'Dislike Comment'), ('REPORT_COMMENT', 'Report Comment'), ('COURSE_APPROVED', 'Course Approved'), ('COURSE_REJECTED', 'Course Rejected'), ('USER_BANNED', 'User Banned'), ('USER_UNBANNED', 'User Unbanned'), ('EMAIL_SENT', 'Email Sent'), ('SYSTEM_CONFIGURED', 'System Configured'), ('OTHER', 'Other')], max_length=50)),
                ('description', models.TextField(blank=True, null=True)),
                ('entity_type', models.CharField(blank=True, max_length=100, null=True)),
                ('entity_id', models.IntegerField(blank=True, null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('trace_id', models.UUIDField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('user_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.user')),
            ],
            options={
                'db_table': 'activity_logs',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['user_id'], name='activity_lo_user_id_ae4956_idx'), models.Index(fields=['action'], name='activity_lo_action_b49f28_idx'), models.Index(fields=['entity_type', 'entity_id'], name='activity_lo_entity__5a4970_idx'), models.Index(fields=['created_at'], name='activity_lo_created_166e11_idx')],
            },
        ),
    ]
