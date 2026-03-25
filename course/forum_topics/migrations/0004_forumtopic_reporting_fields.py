from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forum_topics', '0003_rename_forum_id_forumtopic_forum_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='forumtopic',
            name='last_report_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='forumtopic',
            name='last_reported_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='forumtopic',
            name='report_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
