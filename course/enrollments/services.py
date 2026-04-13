import logging
from rest_framework.exceptions import ValidationError
from .serializers import EnrollmentSerializer, EnrollmentCreateSerializer
from .models import Enrollment
from datetime import datetime
from courses.models import Course
from django.db import IntegrityError
from django.db.models import F
from activity_logs.services import log_activity

logger = logging.getLogger(__name__)

def create_enrollment(data):
    try:

        user_val = data.get('user_id') if 'user_id' in data else data.get('user')
        course_val = data.get('course_id') if 'course_id' in data else data.get('course')

        dataCopy = {
            'user': user_val,
            'course': course_val,
            'payment': data.get('payment'),
            'enrollment_date': datetime.now(),
            'status': Enrollment.Status.Active,
            'expiry_date': data.get('expiry_date', None),
            'source': data.get('source', Enrollment.Source.PURCHASE),
            'subscription': data.get('subscription'),
            'progress': 0,
            'certificate_issue_date': None,
        }

        if hasattr(dataCopy.get('user'), 'id'):
            dataCopy['user'] = getattr(dataCopy['user'], 'id')
        if hasattr(dataCopy.get('course'), 'id'):
            dataCopy['course'] = getattr(dataCopy['course'], 'id')
        if hasattr(dataCopy.get('payment'), 'id'):
            dataCopy['payment'] = getattr(dataCopy['payment'], 'id')
        if hasattr(dataCopy.get('subscription'), 'id'):
            dataCopy['subscription'] = getattr(dataCopy['subscription'], 'id')


        try:
            if dataCopy.get('user') and dataCopy.get('course'):
                existing = Enrollment.objects.filter(user_id=dataCopy.get('user'), course_id=dataCopy.get('course'), is_deleted=False).first()
            if existing:
                return EnrollmentCreateSerializer(existing).data
        except Exception:

            existing = None

        serializer = EnrollmentCreateSerializer(data=dataCopy)
        if serializer.is_valid(raise_exception=True):
            try:
                enrollment = serializer.save()
            except IntegrityError:
                raise ValidationError({"error": "User has already enrolled in this course."})

            course = Course.objects.get(id=dataCopy.get('course'))
            Course.objects.filter(id=course.id).update(total_students=F('total_students') + 1)
            log_activity(
                user_id=enrollment.user.id,
                action="ENROLL",
                entity_type="Enrollment",
                entity_id=enrollment.id,
                description=f"Đăng ký khóa học: {course.title}"
            )
            return EnrollmentCreateSerializer(enrollment).data
        raise ValidationError(serializer.errors)
    except ValidationError:

        raise
    except Exception as e:

        raise ValidationError({"error": f"Lỗi khi tạo enrollment: {str(e)}"})
def get_enrollment_by_user(user_id):
    logger = logging.getLogger(__name__)
    logger.info(f"service.get_enrollment_by_user called for user_id={user_id}")
    try:
        enrollments = Enrollment.objects.select_related(
            'course__instructor__user', 'course__category'
        ).filter(user=user_id, is_deleted=False)
        return enrollments
    except Exception as e:
        logger.error(f"error in get_enrollment_by_user: {e}")
        raise ValidationError({"error": str(e)})
def find_enrollment_by_id(enrollment_id):
    try:
        enrollment = Enrollment.objects.get(id=enrollment_id)
        serializer = EnrollmentSerializer(enrollment)
        return serializer.data
    except Enrollment.DoesNotExist:
        raise ValidationError({"error": "Enrollment not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})
def find_by_user_and_course(user_id, course_id):
    try:
        enrollment = Enrollment.objects.get(user_id=user_id, course_id=course_id)
        serializer = EnrollmentSerializer(enrollment)
        return serializer.data
    except Enrollment.DoesNotExist:
        raise ValidationError({"error": "Enrollment not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})
def count_enrollments_by_course(course_id):
    try:
        count = Enrollment.objects.filter(course=course_id).count()
        return count
    except Exception as e:
        raise ValidationError({"error": str(e)})
def has_access(user_id, course_id):
    try:
        enrollment = Enrollment.objects.get(user=user_id, course=course_id)
        if enrollment.status == Enrollment.Status.Active:
            return True
        return False
    except Enrollment.DoesNotExist:
        raise ValidationError({"error": "Enrollment not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})
















def user_has_course_access(user_id, course_id):
    return Enrollment.objects.filter(
        user_id=user_id,
        course_id=course_id,
        status=Enrollment.Status.Active,
        is_deleted=False,
    ).exists()
