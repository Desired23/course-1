from rest_framework.exceptions import ValidationError
from .models import Lesson
from .serializers import LessonSerializer
from users.models import User

def validate_lesson_data(data):

    serializer = LessonSerializer(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}

def get_lessons():
    lessons = Lesson.objects.all()
    if not lessons.exists():
        raise ValidationError({"error": "No lessons found."})
    return lessons  # Trả về queryset trực tiếp

def get_lesson_by_id(lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        serializer = LessonSerializer(lesson)
        return serializer.data
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})

def create_lesson(data, user):
    from coursemodules.models import CourseModule
    
    try:
        user_instance = User.objects.get(pk=user)  # Truy cập qua data
        print(user_instance)
    except User.DoesNotExist:
        raise ValidationError({"user_id": "User with this ID does not exist."})

    # Kiểm tra nếu user đã là Instructor
    if user_instance.user_type == User.UserTypeChoices.STUDENT:
        raise ValidationError({"user_id": "Người dùng không đủ quyền."})
    
    # Validate coursemodule exists and is not deleted
    coursemodule_id = data.get('coursemodule')
    if not coursemodule_id:
        raise ValidationError({"coursemodule": "Coursemodule is required."})
    
    try:
        coursemodule = CourseModule.objects.get(id=coursemodule_id, is_deleted=False)
    except CourseModule.DoesNotExist:
        raise ValidationError({"coursemodule": "Coursemodule does not exist or has been deleted."})

    # Sửa đổi data để truyền user instance, không phải user_id
    modified_data = data.copy()  # Tạo bản sao để không ảnh hưởng đến dữ liệu gốc
    modified_data['user'] = user_instance
    serializer = LessonSerializer(data=modified_data, context={'request': None})  # Truyền modified_data
    if serializer.is_valid(raise_exception=True):
        lesson = serializer.save()
        return lesson
    raise ValidationError(serializer.errors)

def update_lesson(lesson_id, data):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})

    serializer = LessonSerializer(lesson, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_lesson = serializer.save()
        return updated_lesson
    raise ValidationError(serializer.errors)

def delete_lesson(lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        lesson.delete()
        return {"message": "Lesson deleted successfully."}
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})