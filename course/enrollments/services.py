from rest_framework.exceptions import ValidationError
from .serializers import EnrollmentSerializer, EnrollmentCreateSerializer
from .models import Enrollment
from datetime import datetime
from courses.models import Course
from django.db import IntegrityError
from django.db.models import F
from activity_logs.services import log_activity

def create_enrollment(data):
    try: 
        # Accept either {'user_id', 'course_id'} or {'user', 'course'} inputs.
        user_val = data.get('user_id') if 'user_id' in data else data.get('user')
        course_val = data.get('course_id') if 'course_id' in data else data.get('course')

        dataCopy = {
            'user': user_val,
            'course': course_val,
            'enrollment_date': datetime.now(),   
            'status': Enrollment.Status.Active,
            'expiry_date': data.get('expiry_date', None),
            'progress': 0,
            'certificate_issue_date': None,
        }
        # If caller passed model instances instead of ids, normalize to ids
        if hasattr(dataCopy.get('user'), 'id'):
            dataCopy['user'] = getattr(dataCopy['user'], 'id')
        if hasattr(dataCopy.get('course'), 'id'):
            dataCopy['course'] = getattr(dataCopy['course'], 'id')

        # If enrollment already exists, return it (idempotent)
        try:
            if dataCopy.get('user') and dataCopy.get('course'):
                existing = Enrollment.objects.filter(user_id=dataCopy.get('user'), course_id=dataCopy.get('course'), is_deleted=False).first()
            if existing:
                return EnrollmentCreateSerializer(existing).data
        except Exception:
            # ignore existence check failures and proceed to create
            existing = None

        serializer = EnrollmentCreateSerializer(data=dataCopy)
        if serializer.is_valid(raise_exception=True):
            try:
                enrollment = serializer.save()
            except IntegrityError:
                raise ValidationError({"error": "User has already enrolled in this course."})
            # Resolve course id from normalized dataCopy ('course' key holds id)
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
        # propagate serializer/validation errors as-is so caller can return 400 with details
        raise
    except Exception as e:
        # Unexpected error — include message for debugging
        raise ValidationError({"error": f"Lỗi khi tạo enrollment: {str(e)}"})
def get_enrollment_by_user(user_id):
    try:
        enrollments = Enrollment.objects.select_related(
            'course__instructor__user', 'course__category'
        ).filter(user=user_id)
        if not enrollments.exists():
            raise ValidationError({"error": "No enrollments found."})
        return enrollments
    except Exception as e:
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
# def process_enrollment(enrollment_id):
#     try:
#         enrollment = Enrollment.objects.get(enrollment_id=enrollment_id)
#         if enrollment.progress == 100:
#             enrollment.status = Enrollment.Status.Complete
#             enrollment.completion_date = datetime.now()
#             enrollment.certificate = "Certificate of Completion"
#             enrollment.certificate_issue_date = datetime.now()
#             enrollment.save()
#         else:
#             enrollment.progress 
#         return {"message": "Enrollment completed successfully."}
#     except Enrollment.DoesNotExist:
#         raise ValidationError({"error": "Enrollment not found."})
#     except Exception as e:
#         raise ValidationError({"error": str(e)})
def user_has_course_access(user_id, course_id):
    return Enrollment.objects.filter(
        user_id=user_id,
        course_id=course_id,
        status=Enrollment.Status.Active,
        is_deleted=False,
    ).exists()
