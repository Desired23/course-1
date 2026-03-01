from django.db import migrations, models
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_levels', '0003_rename_instructor_level_id_instructorlevel_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='instructorlevel',
            name='plan_commission_rate',
            field=models.DecimalField(
                decimal_places=2, default=Decimal('30.00'), max_digits=5,
                help_text='% platform giữ lại khi giảng viên tham gia plan (revenue sharing)'
            ),
        ),
        migrations.AddField(
            model_name='instructorlevel',
            name='min_plan_minutes',
            field=models.IntegerField(
                default=0,
                help_text='Tổng số phút học viên học qua plan tối thiểu để đạt level này (0 = không yêu cầu)'
            ),
        ),
    ]
