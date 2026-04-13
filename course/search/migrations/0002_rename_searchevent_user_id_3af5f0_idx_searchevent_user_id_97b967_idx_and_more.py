

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('search', '0001_initial'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='searchevent',
            new_name='SearchEvent_user_id_97b967_idx',
            old_name='SearchEvent_user_id_3af5f0_idx',
        ),
        migrations.RenameIndex(
            model_name='searchevent',
            new_name='SearchEvent_normali_e9b0a8_idx',
            old_name='SearchEvent_normali_2ec3ff_idx',
        ),
        migrations.RenameIndex(
            model_name='searchevent',
            new_name='SearchEvent_source_c4f464_idx',
            old_name='SearchEvent_source_b2af00_idx',
        ),
    ]
