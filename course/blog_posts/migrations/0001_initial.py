

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('categories', '0002_alter_category_status'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlogPost',
            fields=[
                ('blog_post_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('content', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('status', models.CharField(choices=[('draft', 'draft'), ('published', 'published'), ('archived', 'archived')], default='draft', max_length=20)),
                ('tags', models.JSONField(blank=True, null=True)),
                ('slug', models.SlugField(max_length=255, unique=True)),
                ('featured_image', models.CharField(blank=True, max_length=255, null=True)),
                ('sumary', models.TextField(blank=True, null=True)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('views', models.IntegerField(default=0)),
                ('allow_comments', models.BooleanField(default=True)),
                ('is_featured', models.BooleanField(default=False)),
                ('author_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blog_posts', to='users.user')),
                ('category_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='blog_posts', to='categories.category')),
            ],
            options={
                'db_table': 'blog_posts',
            },
        ),
    ]
