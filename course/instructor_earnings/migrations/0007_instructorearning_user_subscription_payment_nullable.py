from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('instructor_earnings', '0006_remove_instructorearning_instructore_instruc_709b79_idx_and_more'),
        ('subscription_plans', '0004_plancourse_scheduled_removal_usersubscription_notified'),
    ]

    operations = [
        # make payment nullable
        migrations.AlterField(
            model_name='instructorearning',
            name='payment',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='instructor_earnings',
                to='payments.payment',
            ),
        ),
        # add user_subscription FK
        migrations.AddField(
            model_name='instructorearning',
            name='user_subscription',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='instructor_earnings',
                to='subscription_plans.usersubscription',
                help_text='Earning từ subscription (revenue sharing)',
            ),
        ),
        # update unique_together
        migrations.AlterUniqueTogether(
            name='instructorearning',
            unique_together={
                ('payment', 'course', 'instructor'),
                ('user_subscription', 'course', 'instructor'),
            },
        ),
    ]
