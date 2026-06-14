from django.db import migrations
from django.db.models import Count, Q, Sum


def recalculate_course_and_module_durations(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    CourseModule = apps.get_model('coursemodules', 'CourseModule')

    courses = Course.objects.filter(is_deleted=False).values_list('id', flat=True)

    for course_id in courses.iterator():
        modules = CourseModule.objects.filter(course_id=course_id, is_deleted=False).annotate(
            lesson_count=Count('lessons', filter=Q(lessons__is_deleted=False)),
            duration_total=Sum('lessons__duration', filter=Q(lessons__is_deleted=False)),
        )

        total_modules = modules.count()
        total_lessons = 0
        total_duration = 0

        for module in modules:
            module_duration = module.duration_total or 0
            total_lessons += module.lesson_count
            total_duration += module_duration
            CourseModule.objects.filter(id=module.id).update(
                duration=module_duration or None,
            )

        Course.objects.filter(id=course_id).update(
            total_modules=total_modules,
            total_lessons=total_lessons,
            duration=total_duration or None,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('coursemodules', '0006_alter_coursemodule_options'),
        ('courses', '0011_alter_course_options'),
        ('lessons', '0006_alter_lesson_content_type_add_code'),
    ]

    operations = [
        migrations.RunPython(
            recalculate_course_and_module_durations,
            migrations.RunPython.noop,
        ),
    ]
