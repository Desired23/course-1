from rest_framework.exceptions import ValidationError
from .models import CourseModule
from .serializers import CourseModuleSerializer
from .models import CourseModule

def validate_course_module_data(data):
    serializer = CourseModuleSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}

def get_course_modules():
    course_modules = CourseModule.objects.all()
    if not course_modules.exists():
        raise ValidationError({"error": "No course modules found."})
    return course_modules  # Trả về queryset trực tiếp

def get_course_module_by_id(course_module_id):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
        serializer = CourseModuleSerializer(course_module)
        return serializer.data
    except CourseModule.DoesNotExist:
        raise ValidationError({"error": "Course module not found."})

def create_course_module(data):
    """Tạo một module khóa học mới."""
    serializer = CourseModuleSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        course_module = serializer.save()
        return course_module
    raise ValidationError(serializer.errors)

def update_course_module(course_module_id, data):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
    except CourseModule.DoesNotExist:
        raise ValidationError({"error": "Course module not found."})

    serializer = CourseModuleSerializer(course_module, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_course_module = serializer.save()
        return updated_course_module
    raise ValidationError(serializer.errors)

def delete_course_module(course_module_id):
    try:
        course_module = CourseModule.objects.get(id=course_module_id)
        course_module.delete()
        return {"message": "Course module deleted successfully."}
    except CourseModule.DoesNotExist:
        raise ValidationError({"error": "Course module not found."})