

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0001_initial'),
        ('users', '0003_user_deleted_at_user_deleted_by_user_is_deleted_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='review',
            old_name='review_date',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='review',
            old_name='response_date',
            new_name='updated_at',
        ),
        migrations.RemoveField(
            model_name='review',
            name='updated_date',
        ),
        migrations.AddField(
            model_name='review',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='review',
            name='deleted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deleted_reviews', to='users.user'),
        ),
        migrations.AddField(
            model_name='review',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='review',
            name='response_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
