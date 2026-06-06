from django.db.models import Q, F
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from utils.roles import is_active_admin

from .models import Question
from .serializers import QuestionSerializer


def _is_admin(user):
    return is_active_admin(user)


def create_question(data, author):
    payload = dict(data)
    payload.pop('author', None)
    serializer = QuestionSerializer(data=payload)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    return QuestionSerializer(serializer.save(author=author)).data


def get_question_by_id(question_id):
    try:
        return QuestionSerializer(Question.objects.get(id=question_id, is_deleted=False)).data
    except Question.DoesNotExist:
        raise NotFound("Question not found.")


def get_all_questions(search=None, tag=None, status=None, sort='newest'):
    qs = Question.objects.filter(is_deleted=False)
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))
    if tag:
        qs = qs.filter(tags__contains=[tag])
    if status:
        qs = qs.filter(status=status)
    if sort == 'votes':
        qs = qs.order_by('-score', '-created_at')
    elif sort == 'unanswered':
        qs = qs.filter(answer_count=0).order_by('-created_at')
    else:
        qs = qs.order_by('-created_at')
    return qs


def update_question(question_id, data, actor):
    try:
        question = Question.objects.get(id=question_id, is_deleted=False)
    except Question.DoesNotExist:
        raise NotFound("Question not found.")
    if question.author_id != actor.id and not _is_admin(actor):
        raise PermissionDenied("Bạn không có quyền chỉnh sửa câu hỏi này.")
    payload = dict(data)
    payload.pop('author', None)
    serializer = QuestionSerializer(question, data=payload, partial=True)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    return QuestionSerializer(serializer.save()).data


def delete_question(question_id, actor):
    try:
        question = Question.objects.get(id=question_id, is_deleted=False)
    except Question.DoesNotExist:
        raise NotFound("Question not found.")
    if question.author_id != actor.id and not _is_admin(actor):
        raise PermissionDenied("Bạn không có quyền xóa câu hỏi này.")
    question.is_deleted = True
    question.deleted_at = timezone.now()
    question.deleted_by = actor
    question.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
    return {'message': 'Question deleted successfully'}


def increase_question_views(question_id):
    updated = Question.objects.filter(id=question_id, is_deleted=False).update(views=F('views') + 1)
    if not updated:
        raise NotFound("Question not found.")
    return {'message': 'Views updated'}


def report_question(question_id, reason=''):
    try:
        question = Question.objects.get(id=question_id, is_deleted=False)
        question.report_count += 1
        question.last_report_reason = (reason or '').strip() or question.last_report_reason
        question.last_reported_at = timezone.now()
        question.save(update_fields=['report_count', 'last_report_reason', 'last_reported_at'])
        try:
            from notifications.services import notify_admins
            notify_admins(
                title="Câu hỏi bị báo cáo",
                message=f"Câu hỏi #{question.id} bị báo cáo ({question.report_count} lần). Lý do: {question.last_report_reason or 'Không có'}",
                type='other',
                notification_code='question_reported',
                related_id=question.id,
            )
        except Exception:
            pass
        return QuestionSerializer(question).data
    except Question.DoesNotExist:
        raise NotFound("Question not found.")


def moderate_question(question_id, action, reason=''):
    try:
        question = Question.objects.get(id=question_id)
    except Question.DoesNotExist:
        raise NotFound("Question not found.")

    action = (action or '').strip().lower()
    if action == 'approve':
        question.status = 'open'
        question.report_count = 0
    elif action == 'dismiss':
        question.report_count = 0
    elif action in ('hide', 'close'):
        question.status = 'closed'
        question.report_count = 0
    elif action == 'delete':
        question.is_deleted = True
        question.deleted_at = timezone.now()
        question.report_count = 0
    else:
        raise ValidationError({'error': 'Invalid action. Use: approve, dismiss, hide, delete'})

    if reason:
        question.last_report_reason = reason.strip()
    question.save()
    return QuestionSerializer(question).data


def accept_answer(question_id, answer_id, actor):
    try:
        from answers.models import Answer
        question = Question.objects.get(id=question_id, is_deleted=False)
        Answer.objects.filter(question=question, is_accepted=True).update(is_accepted=False)
        answer = Answer.objects.get(id=answer_id, question=question, is_deleted=False)
        answer.is_accepted = True
        answer.save(update_fields=['is_accepted'])
        try:
            from notifications.services import create_notification
            create_notification(
                receiver_id=answer.author_id,
                title="Câu trả lời của bạn được chấp nhận",
                message="Câu trả lời của bạn đã được chọn là câu trả lời tốt nhất.",
                type='other',
                related_id=answer.id,
                notification_code='answer_accepted',
            )
        except Exception:
            pass
        return QuestionSerializer(question).data
    except Question.DoesNotExist:
        raise NotFound("Question not found.")
    except Answer.DoesNotExist:
        raise ValidationError({'error': 'Answer not found or does not belong to this question'})
