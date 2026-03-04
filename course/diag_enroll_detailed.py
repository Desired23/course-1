import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
from django.utils import timezone
from users.models import User
from courses.models import Course
from enrollments.serializers import EnrollmentCreateSerializer
from enrollments.models import Enrollment

student = User.objects.filter(user_type='student').first()
free_course = Course.objects.filter(price__in=[0, '0', None]).first()

print('student:', getattr(student,'id', None), getattr(student,'username', None))
print('course:', getattr(free_course,'id', None), getattr(free_course,'title', None))

data = {
    'user': student.id if student else None,
    'course': free_course.id if free_course else None,
    'enrollment_date': timezone.now(),
    'status': Enrollment.Status.Active,
    'expiry_date': None,
    'progress': 0,
    'certificate_issue_date': None,
}

print('prepared data:', data)
serializer = EnrollmentCreateSerializer(data=data)
print('is_valid (no raise):', serializer.is_valid())
print('errors:', serializer.errors)

try:
    en = serializer.save()
    print('saved enrollment id', en.id)
except Exception as e:
    import traceback
    traceback.print_exc()
    print('save exception repr:', repr(e))
