

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0005_alter_course_category_alter_course_instructor_and_more'),
        ('instructor_earnings', '0007_instructorearning_user_subscription_payment_nullable'),
        ('instructor_payouts', '0005_rename_payout_id_instructorpayout_id_and_more'),
        ('instructors', '0005_rename_user_id_instructor_user'),
        ('payments', '0007_payment_payment_type_payment_subscription_plan'),
        ('subscription_plans', '0004_plancourse_scheduled_removal_usersubscription_notified'),
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='instructorearning',
            unique_together=set(),
        ),
        migrations.AlterField(
            model_name='instructorearning',
            name='payment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='instructor_earnings', to='payments.payment'),
        ),
        migrations.AddConstraint(
            model_name='instructorearning',
            constraint=models.UniqueConstraint(condition=models.Q(('payment__isnull', False)), fields=('payment', 'course', 'instructor'), name='unique_earning_per_payment_course_instructor'),
        ),
        migrations.AddConstraint(
            model_name='instructorearning',
            constraint=models.UniqueConstraint(condition=models.Q(('user_subscription__isnull', False)), fields=('user_subscription', 'course', 'instructor'), name='unique_earning_per_subscription_course_instructor'),
        ),
    ]
