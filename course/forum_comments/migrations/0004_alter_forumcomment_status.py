

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forum_comments', '0003_rename_comment_id_forumcomment_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='forumcomment',
            name='status',
            field=models.CharField(choices=[('active', 'active'), ('deleted', 'deleted')], default='active', max_length=10),
        ),
    ]
