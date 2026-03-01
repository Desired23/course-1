from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('subscription_plans', '0003_coursesubscriptionconsent_subscriptionusage'),
    ]

    operations = [
        # UserSubscription: notification flags
        migrations.AddField(
            model_name='usersubscription',
            name='notified_7d',
            field=models.BooleanField(default=False, help_text='Đã gửi thông báo 7 ngày trước khi hết hạn'),
        ),
        migrations.AddField(
            model_name='usersubscription',
            name='notified_3d',
            field=models.BooleanField(default=False, help_text='Đã gửi thông báo 3 ngày trước khi hết hạn'),
        ),
        # PlanCourse: scheduled removal
        migrations.AddField(
            model_name='plancourse',
            name='scheduled_removal_at',
            field=models.DateTimeField(
                null=True, blank=True,
                help_text='Thời điểm sẽ tự động xóa khóa học khỏi plan (sau khi thông báo 7 ngày)'
            ),
        ),
    ]
