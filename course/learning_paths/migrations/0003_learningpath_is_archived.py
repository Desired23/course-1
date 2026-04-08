from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('learning_paths', '0002_pathconversation_advisor_meta'),
    ]

    operations = [
        migrations.AddField(
            model_name='learningpath',
            name='is_archived',
            field=models.BooleanField(default=False),
        ),
    ]
