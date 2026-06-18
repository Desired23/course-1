from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0005_review_report_metadata'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='review',
            constraint=models.UniqueConstraint(
                fields=('user', 'course'),
                condition=Q(is_deleted=False),
                name='unique_active_review_per_user_course',
            ),
        ),
    ]
