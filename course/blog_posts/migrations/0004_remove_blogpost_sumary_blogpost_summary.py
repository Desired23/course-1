

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('blog_posts', '0003_rename_category_id_blogpost_category_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='blogpost',
            name='sumary',
        ),
        migrations.AddField(
            model_name='blogpost',
            name='summary',
            field=models.TextField(blank=True, db_column='sumary', null=True),
        ),
    ]
