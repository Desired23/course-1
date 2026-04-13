

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('wishlists', '0003_remove_wishlist_unique_wishlist_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='wishlist',
            name='course',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_name='wishlist_course', to='courses.course'),
            preserve_default=False,
        ),
    ]
