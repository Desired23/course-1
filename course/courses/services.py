from rest_framework.exceptions import ValidationError
from .models import Course
from .serializers import CourseSerializer


def create_course(data):
    try:
        serializer = CourseSerializer(data=data)
        if serializer.is_valid():
            course = serializer.save()
            return serializer.data
        raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating course: {str(e)}")

def get_course_by_id(course_id):
    try:
        course = Course.objects.get(id=course_id)
        return CourseSerializer(course).data
    except Course.DoesNotExist:
        raise ValidationError("Course not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving course: {str(e)}")

def get_all_courses():
    try:
        courses = Course.objects.all()
        if not courses.exists():
            raise ValidationError("No courses found.")
        return CourseSerializer(courses, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving all courses: {str(e)}")

def update_course(course_id, data):
    try:
        course = Course.objects.get(id=course_id)
        serializer = CourseSerializer(course, data=data, partial=True)
        if serializer.is_valid():
            updated_course = serializer.save()
            return updated_course
        raise ValidationError(serializer.errors)
    except Course.DoesNotExist:
        raise ValidationError("Course not found")
    except Exception as e:
        raise ValidationError(f"Error updating course: {str(e)}")

def delete_course(course_id):
    try:
        course = Course.objects.get(id=course_id)
        course.delete()
        return {"message": "Course deleted successfully"}
    except Course.DoesNotExist:
        raise ValidationError("Course not found")
    except Exception as e:
        raise ValidationError(f"Error deleting course: {str(e)}")

def validate_course_data(data):
    serializer = CourseSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}
