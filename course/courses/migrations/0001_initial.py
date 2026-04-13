

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('categories', '0002_alter_category_status'),
        ('instructors', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Course',
            fields=[
                ('course_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('shortdescription', models.CharField(blank=True, max_length=255, null=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('thumbnail', models.CharField(blank=True, max_length=255, null=True)),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('discount_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('discount_start_date', models.DateTimeField(blank=True, null=True)),
                ('discount_end_date', models.DateTimeField(blank=True, null=True)),
                ('level', models.CharField(choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced'), ('all_levels', 'All Levels')], default='all_levels', max_length=20)),
                ('language', models.CharField(default='Tiếng Việt', max_length=50)),
                ('duration', models.IntegerField(blank=True, help_text='Thời lượng tính bằng phút', null=True)),
                ('total_lessons', models.IntegerField(default=0)),
                ('total_modules', models.IntegerField(default=0)),
                ('requirements', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('pending', 'Pending'), ('published', 'Published'), ('rejected', 'Rejected'), ('archived', 'Archived')], default='draft', max_length=20)),
                ('is_featured', models.BooleanField(default=False)),
                ('is_public', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('published_date', models.DateTimeField(blank=True, null=True)),
                ('rating', models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ('total_reviews', models.IntegerField(default=0)),
                ('total_students', models.IntegerField(default=0)),
                ('certificate', models.BooleanField(default=False)),
                ('category_id', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='category_courses', to='categories.category')),
                ('instructor_id', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='courses', to='instructors.instructor')),
                ('subcategory_id', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='subcategory_courses', to='categories.category')),
            ],
            options={
                'db_table': 'Courses',
            },
        ),
    ]
