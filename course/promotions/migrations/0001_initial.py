

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('admins', '0005_alter_admin_user_id'),
        ('categories', '0002_alter_category_status'),
        ('courses', '0002_alter_course_instructor_id'),
        ('instructors', '0002_alter_instructor_user_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='Promotion',
            fields=[
                ('promotion_id', models.AutoField(primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=50, unique=True)),
                ('description', models.CharField(blank=True, max_length=255, null=True)),
                ('discount_type', models.CharField(choices=[('percentage', 'percentage'), ('fixed', 'fixed')], max_length=20)),
                ('discount_value', models.DecimalField(decimal_places=2, max_digits=10)),
                ('start_date', models.DateTimeField()),
                ('end_date', models.DateTimeField()),
                ('usage_limit', models.IntegerField(blank=True, null=True)),
                ('used_count', models.IntegerField(default=0)),
                ('min_purchase', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('max_discount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('status', models.CharField(choices=[('active', 'active'), ('inactive', 'inactive'), ('expired', 'expired')], default='active', max_length=10)),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('admin_id', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotions_admin', to='admins.admin')),
                ('applicable_categories', models.ManyToManyField(blank=True, related_name='promotions', to='categories.category')),
                ('applicable_courses', models.ManyToManyField(blank=True, related_name='promotions', to='courses.course')),
                ('instructor_id', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotions_instructor', to='instructors.instructor')),
            ],
            options={
                'db_table': 'Promotions',
            },
        ),
    ]
