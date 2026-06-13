from django.db import migrations


def add_other_category(apps, schema_editor):
    Category = apps.get_model('categories', 'Category')
    Category.objects.get_or_create(
        name='Khác',
        defaults={'description': 'Khóa học nằm ngoài phạm vi danh mục của nền tảng', 'status': 'active'},
    )


def remove_other_category(apps, schema_editor):
    Category = apps.get_model('categories', 'Category')
    Category.objects.filter(name='Khác', parent_category__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0007_alter_category_options'),
    ]

    operations = [
        migrations.RunPython(add_other_category, remove_other_category),
    ]
