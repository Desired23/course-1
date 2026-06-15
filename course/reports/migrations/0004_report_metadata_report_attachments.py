from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0003_alter_report_target_type_copyrightcase_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='report',
            name='metadata',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='report',
            name='attachments',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
