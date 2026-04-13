

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('blog_posts', '0002_blogpost_deleted_at_blogpost_deleted_by_and_more'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.RenameField(
            model_name='blogpost',
            old_name='category_id',
            new_name='category',
        ),
        migrations.RenameField(
            model_name='blogpost',
            old_name='blog_post_id',
            new_name='id',
        ),
        migrations.RemoveField(
            model_name='blogpost',
            name='author_id',
        ),
        migrations.AddField(
            model_name='blogpost',
            name='author',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='blog_posts', to='users.user'),
        ),
    ]
