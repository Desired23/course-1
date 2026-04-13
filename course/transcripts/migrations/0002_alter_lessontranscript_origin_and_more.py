

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transcripts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lessontranscript',
            name='origin',
            field=models.CharField(choices=[('asr', 'Asr'), ('manual', 'Manual'), ('regenerated', 'Regenerated')], default='asr', max_length=16),
        ),
        migrations.AlterField(
            model_name='lessontranscript',
            name='provider',
            field=models.CharField(choices=[('local_whisper', 'Local Whisper')], default='local_whisper', max_length=30),
        ),
        migrations.AlterField(
            model_name='lessontranscript',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('reviewed', 'Reviewed'), ('published', 'Published'), ('stale', 'Stale')], default='draft', max_length=16),
        ),
        migrations.AlterField(
            model_name='transcriptjob',
            name='provider',
            field=models.CharField(choices=[('local_whisper', 'Local Whisper')], default='local_whisper', max_length=30),
        ),
        migrations.AlterField(
            model_name='transcriptjob',
            name='status',
            field=models.CharField(choices=[('queued', 'Queued'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='queued', max_length=20),
        ),
        migrations.AlterField(
            model_name='transcriptjob',
            name='trigger_source',
            field=models.CharField(choices=[('auto_upload', 'Auto Upload'), ('video_updated', 'Video Updated'), ('manual', 'Manual')], default='auto_upload', max_length=20),
        ),
    ]
