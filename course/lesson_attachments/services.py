from rest_framework.exceptions import ValidationError
from django.db.models import Q
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
        return LessonAttachment.objects.filter(lesson=lesson_id)
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


def get_all_lesson_attachments(filters=None):
    try:
        attachments = LessonAttachment.objects.all()
        if filters:
            if filters.get('instructor_id'):
                attachments = attachments.filter(
                    lesson__coursemodule__course__instructor_id=filters['instructor_id']
                )
            if filters.get('course_id'):
                attachments = attachments.filter(
                    lesson__coursemodule__course_id=filters['course_id']
                )
            if filters.get('file_type'):
                attachments = attachments.filter(file_type__icontains=filters['file_type'])
            if filters.get('search'):
                search = str(filters['search']).strip()
                if search:
                    attachments = attachments.filter(
                        Q(title__icontains=search) |
                        Q(file_path__icontains=search) |
                        Q(lesson__title__icontains=search) |
                        Q(lesson__coursemodule__course__title__icontains=search)
                    )

            ordering_map = {
                'newest': '-created_at',
                'downloads': '-download_count',
                'title': 'title',
            }
            attachments = attachments.order_by(ordering_map.get(filters.get('sort_by'), '-created_at'))
        else:
            attachments = attachments.order_by('-created_at')

        return attachments
    except Exception as e:
        raise ValidationError({"error": str(e)})
