

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='status',
            field=models.CharField(choices=[('active', 'active'), ('inactive', 'inactive'), ('banned', 'banned')], default='active', max_length=8),
        ),
        migrations.AlterField(
            model_name='user',
            name='user_type',
            field=models.CharField(choices=[('student', 'student'), ('instructor', 'instructor'), ('admin', 'admin')], max_length=10),
        ),
    ]
