from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0006_usersettings'),
    ]

    operations = [
        migrations.CreateModel(
            name='SearchEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('raw_query', models.CharField(max_length=255)),
                ('normalized_query', models.CharField(max_length=255)),
                ('source', models.CharField(choices=[('global_search', 'global_search')], default='global_search', max_length=32)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='search_events', to='users.user')),
            ],
            options={
                'db_table': 'SearchEvents',
            },
        ),
        migrations.AddIndex(
            model_name='searchevent',
            index=models.Index(fields=['user', '-created_at'], name='SearchEvent_user_id_3af5f0_idx'),
        ),
        migrations.AddIndex(
            model_name='searchevent',
            index=models.Index(fields=['normalized_query', '-created_at'], name='SearchEvent_normali_2ec3ff_idx'),
        ),
        migrations.AddIndex(
            model_name='searchevent',
            index=models.Index(fields=['source', '-created_at'], name='SearchEvent_source_b2af00_idx'),
        ),
    ]

