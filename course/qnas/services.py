from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import QnA
from .serializers import QnASerializer


def create_qna(data):
    try:
        serializer = QnASerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return serializer.data
        raise ValidationError(serializer.errors)
    except Exception as exc:
        raise ValidationError(f"Error creating QnA: {str(exc)}")


def get_qna_by_id(qna_id):
    try:
        qna = QnA.objects.get(id=qna_id, is_deleted=False)
        return QnASerializer(qna).data
    except QnA.DoesNotExist:
        raise ValidationError("QnA not found")
    except Exception as exc:
        raise ValidationError(f"Error retrieving QnA: {str(exc)}")


def get_qna_by_user_id(user_id):
    try:
        return QnA.objects.filter(user=user_id, is_deleted=False)
    except Exception as exc:
        raise ValidationError(f"Error retrieving QnA: {str(exc)}")


def get_all_qna(reported_only=False, status=None, search=None):
    try:
        qna_list = QnA.objects.filter(is_deleted=False)
        if reported_only:
            qna_list = qna_list.filter(report_count__gt=0)
        if status:
            qna_list = qna_list.filter(status=status)
        if search:
            qna_list = qna_list.filter(question__icontains=search)
        return qna_list
    except Exception as exc:
        raise ValidationError(f"Error retrieving all QnA: {str(exc)}")


def update_qna(qna_id, data):
    try:
        qna = QnA.objects.get(id=qna_id, is_deleted=False)
        serializer = QnASerializer(qna, data=data, partial=True)
        if serializer.is_valid():
            updated_qna = serializer.save()
            return QnASerializer(updated_qna).data
        raise ValidationError(serializer.errors)
    except QnA.DoesNotExist:
        raise ValidationError("QnA not found")
    except Exception as exc:
        raise ValidationError(f"Error updating QnA: {str(exc)}")


def delete_qna(qna_id):
    try:
        qna = QnA.objects.get(id=qna_id, is_deleted=False)
        qna.is_deleted = True
        qna.deleted_at = timezone.now()
        qna.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
        return {"message": "QnA deleted successfully"}
    except QnA.DoesNotExist:
        raise ValidationError("QnA not found")
    except Exception as exc:
        raise ValidationError(f"Error deleting QnA: {str(exc)}")


def report_qna(qna_id, reason=''):
    try:
        qna = QnA.objects.get(id=qna_id, is_deleted=False)
    except QnA.DoesNotExist:
        raise ValidationError("QnA not found")

    qna.report_count += 1
    cleaned_reason = (reason or '').strip()
    if cleaned_reason:
        qna.last_report_reason = cleaned_reason
    qna.last_reported_at = timezone.now()
    qna.save(update_fields=['report_count', 'last_report_reason', 'last_reported_at', 'updated_at'])
    return QnASerializer(qna).data


def moderate_qna(qna_id, action, reason=''):
    try:
        qna = QnA.objects.get(id=qna_id, is_deleted=False)
    except QnA.DoesNotExist:
        raise ValidationError("QnA not found")

    action = (action or '').strip().lower()
    cleaned_reason = (reason or '').strip()

    if action == 'approve':
        qna.report_count = 0
    elif action == 'dismiss':
        qna.report_count = 0
    elif action == 'close':
        qna.status = QnA.StatusChoices.CLOSED
        qna.report_count = 0
    elif action == 'delete':
        qna.is_deleted = True
        qna.deleted_at = timezone.now()
        qna.report_count = 0
    else:
        raise ValidationError("Invalid moderation action")

    if cleaned_reason:
        qna.last_report_reason = cleaned_reason
    qna.last_reported_at = timezone.now()
    qna.save(update_fields=[
        'status',
        'report_count',
        'last_report_reason',
        'last_reported_at',
        'is_deleted',
        'deleted_at',
        'updated_at',
    ])
    return QnASerializer(qna).data
