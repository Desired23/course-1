from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('realtime', '0003_backfill_direct_conversations'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='last_report_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='message',
            name='last_reported_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='message',
            name='report_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
