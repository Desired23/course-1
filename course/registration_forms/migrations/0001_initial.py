

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0004_rename_user_id_user_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistrationForm',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('type', models.CharField(choices=[('instructor_application', 'Instructor Application'), ('user_registration', 'User Registration')], max_length=30)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('version', models.IntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_registration_forms', to='users.user')),
            ],
            options={
                'db_table': 'registration_forms',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FormQuestion',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('order', models.IntegerField(default=0)),
                ('label', models.CharField(max_length=500)),
                ('type', models.CharField(choices=[('text', 'Text'), ('textarea', 'Textarea'), ('number', 'Number'), ('select', 'Select'), ('radio', 'Radio'), ('checkbox', 'Checkbox'), ('file', 'File Upload'), ('url', 'URL')], max_length=20)),
                ('placeholder', models.CharField(blank=True, max_length=255, null=True)),
                ('help_text', models.CharField(blank=True, max_length=500, null=True)),
                ('required', models.BooleanField(default=False)),
                ('options', models.JSONField(blank=True, null=True)),
                ('validation_regex', models.CharField(blank=True, max_length=500, null=True)),
                ('file_config', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('form', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='registration_forms.registrationform')),
            ],
            options={
                'db_table': 'form_questions',
                'ordering': ['order'],
            },
        ),
    ]
