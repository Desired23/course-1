from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('learning_paths', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='pathconversation',
            name='advisor_meta',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
