from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('transcripts', '0002_alter_lessontranscript_origin_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='TranscriptChunk',
        ),
    ]
