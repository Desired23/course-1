

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz_questions', '0004_alter_quizquestion_lesson'),
    ]

    operations = [
        migrations.AddField(
            model_name='quizquestion',
            name='allowed_languages',
            field=models.JSONField(blank=True, help_text='Array of Judge0 language IDs allowed for this question', null=True),
        ),
        migrations.AddField(
            model_name='quizquestion',
            name='description',
            field=models.TextField(blank=True, help_text='Detailed description for code questions', null=True),
        ),
        migrations.AddField(
            model_name='quizquestion',
            name='difficulty',
            field=models.CharField(choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')], default='easy', max_length=10),
        ),
        migrations.AddField(
            model_name='quizquestion',
            name='memory_limit',
            field=models.IntegerField(blank=True, help_text='Memory limit in KB for code execution', null=True),
        ),
        migrations.AddField(
            model_name='quizquestion',
            name='starter_code',
            field=models.TextField(blank=True, help_text='Starter/template code for students', null=True),
        ),
        migrations.AddField(
            model_name='quizquestion',
            name='time_limit',
            field=models.IntegerField(blank=True, help_text='Time limit in seconds for code execution', null=True),
        ),
        migrations.AlterField(
            model_name='quizquestion',
            name='question_type',
            field=models.CharField(choices=[('multiple', 'multiple'), ('truefalse', 'true/false'), ('short', 'short'), ('essay', 'Essay'), ('code', 'Code')], max_length=20),
        ),
        migrations.CreateModel(
            name='QuizTestCase',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('input_data', models.TextField(help_text='Input data for the test case')),
                ('expected_output', models.TextField(help_text='Expected output for the test case')),
                ('is_hidden', models.BooleanField(default=False, help_text='Whether this test case is hidden from students')),
                ('points', models.IntegerField(default=0, help_text="Points awarded for passing this test case (0 means use question's points)")),
                ('order_number', models.IntegerField(default=0, help_text='Order of test case execution')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='test_cases', to='quiz_questions.quizquestion')),
            ],
            options={
                'db_table': 'QuizTestCases',
                'ordering': ['order_number'],
            },
        ),
    ]
