import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from users.models import User
from courses.models import Course
from enrollments.services import create_enrollment


student = User.objects.filter(user_type='student').first()
free_course = Course.objects.filter(price__in=[0, '0', None]).first()
print('student', student and student.id)
print('free_course', free_course and free_course.id)

if not student or not free_course:
    print('Missing student or free course in DB')
else:
    try:
        from enrollments.models import Enrollment
        print('already enrolled?', Enrollment.objects.filter(user_id=student.id, course_id=free_course.id).exists())
        res = create_enrollment({'user_id': student.id, 'course_id': free_course.id})
        print('Enrollment created:', res)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('Enrollment error repr:', repr(e))
