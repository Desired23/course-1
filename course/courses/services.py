from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Course
from .serializers import CourseSerializer, CourseDetailSerializer
from activity_logs.services import log_activity


def create_course(data):
    try:
        serializer = CourseSerializer(data=data)
        if serializer.is_valid():
            course = serializer.save()
            log_activity(
                user_id=course.instructor.user.id if course.instructor else None,
                action="CREATE",
                entity_type="Course",
                entity_id=course.id,
                description=f"Tạo khóa học: {course.title}"
            )
            return serializer.data
        raise ValidationError(serializer.errors)
    except ValidationError:
        raise
    except Exception:
        raise ValidationError("Lỗi khi tạo khóa học.")

def get_course_by_id(course_id, user=None):
    try:
        course = Course.objects.select_related(
            'instructor__user', 'category', 'subcategory'
        ).prefetch_related(
            'modules__lessons__quiz_question_lesson'
        ).get(id=course_id, is_deleted=False)
        return CourseDetailSerializer(course, context={'user': user}).data
    except Course.DoesNotExist:
        raise ValidationError("Course not found")
    except ValidationError:
        raise
    except Exception:
        raise ValidationError("Lỗi khi lấy thông tin khóa học.")

def get_all_courses(instructor_id=None, category_id=None, subcategory_id=None,
                    status=None, is_featured=None, level=None, search=None,
                    ordering=None, rating_min=None, language=None,
                    price_min=None, price_max=None):
    try:
        courses = Course.objects.filter(is_deleted=False).select_related(
            'instructor__user', 'category', 'subcategory'
        )
        if instructor_id:
            courses = courses.filter(instructor_id=instructor_id)
        if category_id:
            courses = courses.filter(category_id=category_id)
        if subcategory_id:
            courses = courses.filter(subcategory_id=subcategory_id)
        if status:
            courses = courses.filter(status=status)
        if is_featured is not None:
            courses = courses.filter(is_featured=is_featured)
        if level:
            courses = courses.filter(level=level)
        if rating_min is not None:
            courses = courses.filter(rating__gte=rating_min)
        if language:
            courses = courses.filter(language__iexact=language)
        if price_min is not None:
            courses = courses.filter(price__gte=price_min)
        if price_max is not None:
            courses = courses.filter(price__lte=price_max)
        if search:
            from django.db.models import Q
            courses = courses.filter(
                Q(title__icontains=search) |
                Q(shortdescription__icontains=search) |
                Q(description__icontains=search)
            )
        if ordering:
            allowed = {
                'created_at', '-created_at',
                'price', '-price',
                'rating', '-rating',
                'total_students', '-total_students',
                'title', '-title',
            }
            if ordering in allowed:
                courses = courses.order_by(ordering)
        return courses
    except Exception:
        raise ValidationError("Lỗi khi lấy danh sách khóa học.")


def get_public_stats():
    """Return aggregate platform stats for the homepage."""
    from users.models import User
    from instructors.models import Instructor
    from django.db.models import Avg
    try:
        total_courses = Course.objects.filter(is_deleted=False, status='published').count()
        total_students = User.objects.filter(user_type='student', status='active', is_deleted=False).count()
        total_instructors = Instructor.objects.count()
        avg_rating = Course.objects.filter(
            is_deleted=False, status='published', rating__gt=0
        ).aggregate(avg=Avg('rating'))['avg'] or 0
        return {
            'total_courses': total_courses,
            'total_students': total_students,
            'total_instructors': total_instructors,
            'avg_rating': round(float(avg_rating), 1)
        }
    except Exception:
        return {
            'total_courses': 0,
            'total_students': 0,
            'total_instructors': 0,
            'avg_rating': 0
        }

def update_course(course_id, data, requesting_user=None):
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
        # Ownership check: instructor can only update own courses
        if requesting_user and not hasattr(requesting_user, 'admin'):
            instructor = getattr(requesting_user, 'instructor', None)
            if not instructor or course.instructor_id != instructor.id:
                raise ValidationError("Bạn không có quyền cập nhật khóa học này.")
        serializer = CourseSerializer(course, data=data, partial=True)
        if serializer.is_valid():
            updated_course = serializer.save()
            log_activity(
                user_id=updated_course.instructor.user.id if updated_course.instructor else None,
                action="UPDATE",
                entity_type="Course",
                entity_id=course_id,
                description=f"Cập nhật khóa học: {updated_course.title}"
            )
            return serializer.data
        raise ValidationError(serializer.errors)
    except Course.DoesNotExist:
        raise ValidationError("Course not found")

def delete_course(course_id, requesting_user=None):
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
        # Ownership check: instructor can only delete own courses
        if requesting_user and not hasattr(requesting_user, 'admin'):
            instructor = getattr(requesting_user, 'instructor', None)
            if not instructor or course.instructor_id != instructor.id:
                raise ValidationError("Bạn không có quyền xóa khóa học này.")
        course_title = course.title
        instructor_id = course.instructor.user.id if course.instructor else None
        course.is_deleted = True
        course.deleted_at = timezone.now()
        course.save(update_fields=['is_deleted', 'deleted_at'])
        log_activity(
            user_id=instructor_id,
            action="DELETE",
            entity_type="Course",
            entity_id=course_id,
            description=f"Xóa khóa học: {course_title}"
        )
        return {"message": "Course deleted successfully"}
    except Course.DoesNotExist:
        raise ValidationError("Course not found")

def validate_course_data(data):
    serializer = CourseSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}
