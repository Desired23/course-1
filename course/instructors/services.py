from rest_framework.exceptions import ValidationError
from .models import Instructor
from .serializers import InstructorSerializers
from  users.models import User

def validate_instructor_data(data):
    serializer = InstructorSerializers(data=data)
    if serializer.is_valid():
        return {"message": "Data is valid."}
    return {"errors": serializer.errors}

def get_instructors():
    instructors = Instructor.objects.all()
    if not instructors.exists():
        raise ValidationError({"error": "No instructors found."})
    return instructors

def get_instructor_by_id(instructor_id):
    try:
        instructor = Instructor.objects.get(id=instructor_id)
        serializer = InstructorSerializers(instructor)
        return serializer.data
    except Instructor.DoesNotExist:
        raise ValidationError({"error": "Instructor not found."})

def create_instructor(data):
    """Tạo một giảng viên mới."""
    user_id = data.get('user_id') or data.get('user')
    try:
        user_instance = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise ValidationError({"user_id": "User with this ID does not exist."})


    if user_instance.user_type == User.UserTypeChoices.INSTRUCTOR:
        raise ValidationError({"user_id": "This user is already an instructor."})


    user_instance.user_type = User.UserTypeChoices.INSTRUCTOR
    user_instance.save()


    modified_data = data.copy()
    modified_data['user_id'] = user_id

    serializer = InstructorSerializers(data=modified_data, context={'request': None})
    if serializer.is_valid(raise_exception=True):
        instructor = serializer.save()
        return instructor
    raise ValidationError(serializer.errors)

def update_instructor(instructor_id, data):
    try:
        instructor = Instructor.objects.get(id=instructor_id)
    except Instructor.DoesNotExist:
        raise ValidationError({"error": "Instructor not found."})

    serializer = InstructorSerializers(instructor, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_instructor = serializer.save()
        return updated_instructor
    raise ValidationError(serializer.errors)

def delete_instructor(instructor_id):
    try:
        instructor = Instructor.objects.get(id=instructor_id)
        instructor.delete()
        return {"message": "Instructor deleted successfully."}
    except Instructor.DoesNotExist:
        raise ValidationError({"error": "Instructor not found."})