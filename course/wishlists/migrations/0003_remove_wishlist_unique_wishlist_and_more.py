

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('users', '0004_rename_user_id_user_id'),
        ('wishlists', '0002_remove_wishlist_added_date_wishlist_created_at_and_more'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='wishlist',
            name='unique_wishlist',
        ),
        migrations.RenameField(
            model_name='wishlist',
            old_name='wishlist_id',
            new_name='id',
        ),
        migrations.RenameField(
            model_name='wishlist',
            old_name='user_id',
            new_name='user',
        ),
        migrations.RemoveField(
            model_name='wishlist',
            name='course_id',
        ),
        migrations.AddField(
            model_name='wishlist',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='wishlist_course', to='courses.course'),
        ),
        migrations.AddConstraint(
            model_name='wishlist',
            constraint=models.UniqueConstraint(fields=('user', 'course'), name='unique_wishlist'),
        ),
    ]
