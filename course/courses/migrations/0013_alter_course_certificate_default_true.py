from django.db import migrations, models


def enable_certificate_for_existing_courses(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    Course.objects.filter(certificate=False).update(certificate=True)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0012_recalculate_course_and_module_durations'),
    ]

    operations = [
        migrations.AlterField(
            model_name='course',
            name='certificate',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(
            enable_certificate_for_existing_courses,
            migrations.RunPython.noop,
        ),
    ]
