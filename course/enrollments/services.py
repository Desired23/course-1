from rest_framework.exceptions import ValidationError
from .serializers import EnrollmentSerializer, EnrollmentCreateSerializer
from .models import Enrollment
from datetime import datetime
from courses.models import Course
from django.db import IntegrityError
from activity_logs.services import log_activity

def create_enrollment(data):
    try: 
        print("Data received for enrollment creation:", data)
        dataCopy = {
            'user_id': data['user_id'],
            'course_id': data['course_id'],
            'enrollment_date': datetime.now(),   
            'status': Enrollment.Status.Active,
            'expiry_date': data.get('expiry_date', None),
            'progress': 0,
            'certificate_issue_date': None,
        }
        serializer = EnrollmentCreateSerializer(data=dataCopy)
        if serializer.is_valid(raise_exception=True):
            try:
                enrollment = serializer.save()
            except IntegrityError:
                raise ValidationError({"error": "User has already enrolled in this course."})
            course = Course.objects.get(id=dataCopy.get('course_id'))
            course.total_students += 1
            course.save()
            log_activity(
                user_id=enrollment.user.id,
                action="ENROLL",
                entity_type="Enrollment",
                entity_id=enrollment.id,
                description=f"Đăng ký khóa học: {course.title}"
            )
            return EnrollmentCreateSerializer(enrollment).data 
        raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError({"error": str(e)})
def get_enrollment_by_user(user_id):
    try:
        enrollments = Enrollment.objects.filter(user=user_id)
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
        status='Active'
    ).exists()
