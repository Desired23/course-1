

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_earnings', '0009_instructorearning_phase_d_indexes'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='instructorearning',
            new_name='InstructorE_instruc_ef07b6_idx',
            old_name='InstructorEa_instru_6f71eb_idx',
        ),
        migrations.RenameIndex(
            model_name='instructorearning',
            new_name='InstructorE_instruc_68a8c4_idx',
            old_name='InstructorEa_instru_928722_idx',
        ),
        migrations.RenameIndex(
            model_name='instructorearning',
            new_name='InstructorE_is_dele_4c0fe9_idx',
            old_name='InstructorEa_is_dele_7d5fd5_idx',
        ),
    ]
