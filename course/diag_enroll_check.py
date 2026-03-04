import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
from enrollments.models import Enrollment
from users.models import User
from courses.models import Course

print('exists', Enrollment.objects.filter(user_id=88, course_id=136).exists())
print('user', User.objects.filter(id=88).exists())
print('course', Course.objects.filter(id=136).exists())
