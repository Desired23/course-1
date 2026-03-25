from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0004_alter_review_course_alter_review_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='last_report_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='review',
            name='last_reported_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
