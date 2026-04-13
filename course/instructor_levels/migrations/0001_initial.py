

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='InstructorLevel',
            fields=[
                ('instructor_level_id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('min_students', models.IntegerField(default=0)),
                ('min_revenue', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('commission_rate', models.DecimalField(decimal_places=2, default=30.0, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'InstructorLevels',
            },
        ),
    ]
