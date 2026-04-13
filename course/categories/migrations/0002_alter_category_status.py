

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='category',
            name='status',
            field=models.CharField(choices=[('active', 'active'), ('inactive', 'inactive'), ('banned', 'banned')], default='active', max_length=8),
        ),
    ]
