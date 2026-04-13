

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('instructors', '0005_rename_user_id_instructor_user'),
        ('subscription_plans', '0004_plancourse_scheduled_removal_usersubscription_notified'),
    ]

    operations = [
        migrations.AlterField(
            model_name='coursesubscriptionconsent',
            name='instructor',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='course_subscription_consents', to='instructors.instructor'),
        ),
    ]
