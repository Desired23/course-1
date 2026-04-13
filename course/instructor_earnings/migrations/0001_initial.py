

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('courses', '0001_initial'),
        ('instructor_payouts', '0001_initial'),
        ('instructors', '0001_initial'),
        ('payments', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='InstructorEarning',
            fields=[
                ('earning_id', models.AutoField(primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('commission_rate', models.DecimalField(decimal_places=2, max_digits=5)),
                ('net_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('status', models.CharField(choices=[('pending', 'pending'), ('available', 'available'), ('paid', 'paid'), ('cancelled', 'cancelled')], default='pending', max_length=10)),
                ('earning_date', models.DateTimeField(auto_now_add=True)),
                ('course_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='earnings', to='courses.course')),
                ('instructor_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='earnings', to='instructors.instructor')),
                ('instructor_payout_id', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='earnings', to='instructor_payouts.instructorpayout')),
                ('payment_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='instructor_earnings', to='payments.payment')),
            ],
            options={
                'verbose_name': 'Instructor Earning',
                'verbose_name_plural': 'Instructor Earnings',
                'db_table': 'InstructorEarnings',
                'indexes': [models.Index(fields=['status'], name='InstructorE_status_8cc046_idx'), models.Index(fields=['instructor_id'], name='InstructorE_instruc_b4a195_idx'), models.Index(fields=['course_id'], name='InstructorE_course__1df5fd_idx')],
            },
        ),
    ]
