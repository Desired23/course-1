from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("systems_settings", "0005_platformsetting"),
    ]

    operations = [
        migrations.AlterField(
            model_name="platformsetting",
            name="site_name",
            field=models.CharField(default="coursePlatform", max_length=120),
        ),
        migrations.RemoveField(
            model_name="platformsetting",
            name="auto_approve_course",
        ),
        migrations.RemoveField(
            model_name="platformsetting",
            name="auto_approve_refund",
        ),
        migrations.RemoveField(
            model_name="platformsetting",
            name="platform_config",
        ),
        migrations.RemoveField(
            model_name="paymentsetting",
            name="refund_settings",
        ),
        migrations.RemoveField(
            model_name="paymentsetting",
            name="subscription_revenue_pool",
        ),
    ]
