

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('qnas', '__first__'),
        ('users', '0002_alter_user_status_alter_user_user_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='QnAAnswer',
            fields=[
                ('answer_id', models.AutoField(primary_key=True, serialize=False)),
                ('answer', models.TextField()),
                ('answered_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True)),
                ('is_accepted', models.BooleanField(default=False)),
                ('likes', models.IntegerField(default=0)),
                ('qna_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answwer_qna', to='qnas.qna')),
                ('user_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answer_user', to='users.user')),
            ],
            options={
                'db_table': 'QnAAnswers',
            },
        ),
    ]
