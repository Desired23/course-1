

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carts', '0004_remove_cart_unique_cart_rename_cart_id_cart_id_and_more'),
        ('courses', '0004_rename_category_id_course_category_and_more'),
        ('promotions', '0003_rename_admin_id_promotion_admin_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cart',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cart_course', to='courses.course'),
        ),
        migrations.AlterField(
            model_name='cart',
            name='promotion',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cart_promotion', to='promotions.promotion'),
        ),
    ]
