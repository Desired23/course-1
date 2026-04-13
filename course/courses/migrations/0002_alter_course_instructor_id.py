

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0001_initial'),
        ('instructors', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='course',
            name='instructor_id',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='courses_instructor', to='instructors.instructor'),
        ),
    ]
