from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('learning_paths', '0003_learningpath_is_archived'),
    ]

    operations = [
        migrations.DeleteModel(
            name='PathConversation',
        ),
    ]
