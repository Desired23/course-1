

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('subscription_plans', '0005_alter_coursesubscriptionconsent_instructor'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptionplan',
            name='badge_text',
            field=models.CharField(blank=True, help_text="Text hiển thị trên badge, VD: 'Phổ biến nhất', 'Tiết kiệm nhất'", max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='subscriptionplan',
            name='features',
            field=models.JSONField(blank=True, default=list, help_text='Danh sách quyền lợi gói (list of strings)'),
        ),
        migrations.AddField(
            model_name='subscriptionplan',
            name='highlight_color',
            field=models.CharField(blank=True, help_text='Color theme: blue, yellow, purple, etc.', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='subscriptionplan',
            name='icon',
            field=models.CharField(blank=True, help_text="Icon name for FE display, e.g. 'Zap', 'Crown', 'Shield'", max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='subscriptionplan',
            name='not_included',
            field=models.JSONField(blank=True, default=list, help_text='Danh sách tính năng KHÔNG có trong gói (list of strings)'),
        ),
    ]
