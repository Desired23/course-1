

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_remove_notification_related_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='related_id',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
