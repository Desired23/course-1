

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_levels', '0001_initial'),
        ('users', '0003_user_deleted_at_user_deleted_by_user_is_deleted_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='instructorlevel',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='instructorlevel',
            name='deleted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deleted_instructor_levels', to='users.user'),
        ),
        migrations.AddField(
            model_name='instructorlevel',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='instructorlevel',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
