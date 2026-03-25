from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('qnas', '0005_qna_description_qna_tags_qna_votes'),
    ]

    operations = [
        migrations.AddField(
            model_name='qna',
            name='last_report_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='qna',
            name='last_reported_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='qna',
            name='report_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
