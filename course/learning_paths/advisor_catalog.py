from collections import Counter

from django.db.models import Prefetch

from courses.models import Course
from coursemodules.models import CourseModule
from lessons.models import Lesson


def build_catalog_snapshot():
    lesson_queryset = Lesson.objects.filter(is_deleted=False).only('id', 'coursemodule_id', 'content_type')
    module_queryset = CourseModule.objects.filter(is_deleted=False).prefetch_related(
        Prefetch('lessons', queryset=lesson_queryset)
    )

    courses = (
        Course.objects
        .filter(is_deleted=False, is_public=True, status=Course.Status.PUBLISHED)
        .select_related('category', 'subcategory', 'instructor__user')
        .prefetch_related(Prefetch('modules', queryset=module_queryset))
        .order_by('title')
    )
    snapshot = []
    for course in courses:
        module_count = 0
        lesson_count_by_type = Counter()
        total_lessons = 0

        for module in course.modules.all():
            module_count += 1
            for lesson in module.lessons.all():
                total_lessons += 1
                lesson_count_by_type[str(lesson.content_type or '').lower()] += 1

        total_quizzes = lesson_count_by_type.get('quiz', 0)
        coding_count = lesson_count_by_type.get('code', 0)

        snapshot.append({
            'course_id': course.id,
            'title': course.title,
            'shortdescription': course.shortdescription or '',
            'description': course.description or '',
            'level': course.level,
            'course_price': str(course.price),
            'course_discount_price': str(course.discount_price) if course.discount_price is not None else None,
            'course_discount_start_date': course.discount_start_date.isoformat() if course.discount_start_date else None,
            'course_discount_end_date': course.discount_end_date.isoformat() if course.discount_end_date else None,
            'duration_hours': round(course.duration / 60, 2) if course.duration is not None else None,
            'language': course.language or '',
            'rating': str(course.rating),
            'total_students': course.total_students,
            'has_certificate': course.certificate,
            'instructor_name': (
                course.instructor.user.full_name
                if course.instructor and course.instructor.user
                else ''
            ),
            'target_audience': course.target_audience or [],
            'learning_objectives': course.learning_objectives or [],
            'tags': course.tags or [],
            'category_name': course.category.name if course.category else '',
            'subcategory_name': course.subcategory.name if course.subcategory else '',
            'total_modules': module_count,
            'total_lessons': total_lessons,
            'lesson_count_by_type': dict(lesson_count_by_type),
            'total_quizzes': total_quizzes,
            'exercise_count': coding_count,
            'has_coding_exercises': coding_count > 0,
        })
    return snapshot
