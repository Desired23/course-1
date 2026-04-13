

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('carts', '0001_initial'),
        ('courses', '0001_initial'),
        ('promotions', '__first__'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='cart',
            name='course_id',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cart_course', to='courses.course'),
        ),
        migrations.AddField(
            model_name='cart',
            name='promotion_id',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cart_promotion', to='promotions.promotion'),
        ),
        migrations.AddField(
            model_name='cart',
            name='user_id',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cart_user', to='users.user'),
        ),
        migrations.AddConstraint(
            model_name='cart',
            constraint=models.UniqueConstraint(fields=('user_id', 'course_id'), name='unique_cart'),
        ),
    ]
