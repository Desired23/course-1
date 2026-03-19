from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0005_alter_category_parent_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='icon',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
