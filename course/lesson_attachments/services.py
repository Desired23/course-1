from rest_framework.exceptions import ValidationError
from .models import LessonAttachment
from .serializers import LessonAttachmentSerializer

def create_lesson_attachment(data):
    try:
        serializer = LessonAttachmentSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            lesson_attachment = serializer.save()
            return LessonAttachmentSerializer(lesson_attachment).data
        raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError({"error": str(e)})
    
def get_lesson_attachments_by_lesson(lesson_id):
    try:
        lesson_attachments = LessonAttachment.objects.filter(lesson_id=lesson_id)
        if not lesson_attachments.exists():
            raise ValidationError({"error": "No lesson attachments found."})
        serializer = LessonAttachmentSerializer(lesson_attachments, many=True)
        return serializer.data
    except Exception as e:
        raise ValidationError({"error": str(e)})
    
def find_lesson_attachment_by_id(attachment_id):
    try:
        lesson_attachment = LessonAttachment.objects.get(id=attachment_id)
        serializer = LessonAttachmentSerializer(lesson_attachment)
        return serializer.data
    except LessonAttachment.DoesNotExist:
        raise ValidationError({"error": "Lesson attachment not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})
    
def update_lesson_attachment(attachment_id, data):
    try:
        lesson_attachment = LessonAttachment.objects.get(id=attachment_id)
        serializer = LessonAttachmentSerializer(lesson_attachment, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            updated_lesson_attachment = serializer.save()
            return LessonAttachmentSerializer(updated_lesson_attachment).data
        raise ValidationError(serializer.errors)
    except LessonAttachment.DoesNotExist:
        raise ValidationError({"error": "Lesson attachment not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def delete_lesson_attachment(attachment_id):
    try:
        lesson_attachment = LessonAttachment.objects.get(id=attachment_id)
        lesson_attachment.delete()
        return {"message": "Lesson attachment deleted successfully."}
    except LessonAttachment.DoesNotExist:
        raise ValidationError({"error": "Lesson attachment not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})
    
def get_all_lesson_attachments():
    try:
        lesson_attachments = LessonAttachment.objects.all()
        if not lesson_attachments.exists():
            raise ValidationError({"error": "No lesson attachments found."})
        serializer = LessonAttachmentSerializer(lesson_attachments, many=True)
        return serializer.data
    except Exception as e:
        raise ValidationError({"error": str(e)})