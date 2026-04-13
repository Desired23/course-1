

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lesson_comments', '0002_rename_comment_id_lessoncomment_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lessoncomment',
            name='parent_comment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='replies', to='lesson_comments.lessoncomment'),
        ),
    ]
