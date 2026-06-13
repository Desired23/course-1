from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from utils.roles import is_active_admin

from .models import Answer
from .serializers import AnswerSerializer


def _broadcast_qa(question_id, action, payload):
    channel_layer = get_channel_layer()
    if not channel_layer or not question_id:
        return
    async_to_sync(channel_layer.group_send)(
        f"question_{question_id}",
        {"type": "send_qa_update", "data": {"action": action, **payload}},
    )


def _is_admin(user):
    return is_active_admin(user)


def create_answer(data, author):
    from questions.models import Question
    question_id = data.get('question')
    if not question_id:
        raise ValidationError({'question': 'question is required'})
    if not Question.objects.filter(id=question_id, is_deleted=False, status='open').exists():
        raise ValidationError({'question': 'Question not found or is not open'})
    payload = dict(data)
    payload.pop('author', None)
    serializer = AnswerSerializer(data=payload)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    with transaction.atomic():
        answer = serializer.save(author=author)
        Question.objects.filter(id=question_id).update(answer_count=F('answer_count') + 1)
    try:
        from notifications.services import create_notification
        q = Question.objects.filter(id=question_id).values('author_id').first()
        if q and q['author_id'] and q['author_id'] != author.id:
            create_notification(
                receiver_id=q['author_id'],
                title="Câu hỏi của bạn có câu trả lời mới",
                message="Câu hỏi của bạn vừa nhận được một câu trả lời mới.",
                type='other',
                related_id=answer.id,
                sender=author.id,
                notification_code='answer_received',
            )
    except Exception:
        pass
    data = AnswerSerializer(answer).data
    _broadcast_qa(question_id, 'answer_created', {'answer': dict(data)})
    return data


def get_answers_by_question_id(question_id):
    return Answer.objects.filter(
        question_id=question_id,
        is_deleted=False,
        status='active',
    ).order_by('-is_accepted', '-score', 'created_at')


def update_answer(answer_id, data, actor):
    try:
        answer = Answer.objects.get(id=answer_id, is_deleted=False)
    except Answer.DoesNotExist:
        raise NotFound("Answer not found.")
    if answer.author_id != actor.id and not _is_admin(actor):
        raise PermissionDenied("Bạn không có quyền chỉnh sửa câu trả lời này.")
    payload = dict(data)
    payload.pop('author', None)
    serializer = AnswerSerializer(answer, data=payload, partial=True)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    result = AnswerSerializer(serializer.save()).data
    _broadcast_qa(answer.question_id, 'answer_updated', {'answer': dict(result)})
    return result


def moderate_answer(answer_id, action, reason=''):
    from questions.models import Question
    try:
        answer = Answer.objects.get(id=answer_id, is_deleted=False)
    except Answer.DoesNotExist:
        raise NotFound("Answer not found.")

    action = (action or '').strip().lower()
    was_visible = not answer.is_deleted and answer.status == 'active'
    if action == 'approve':
        answer.status = 'active'
    elif action == 'dismiss':
        pass
    elif action == 'hide':
        answer.status = 'deleted'
    elif action == 'delete':
        answer.is_deleted = True
        answer.deleted_at = timezone.now()
        answer.deleted_by = None
        answer.status = 'deleted'
    else:
        raise ValidationError({'error': 'Invalid action. Use: approve, dismiss, hide, delete'})

    if action in ('hide', 'delete') and was_visible:
        if answer.is_accepted:
            answer.is_accepted = False
        Question.objects.filter(id=answer.question_id, answer_count__gt=0).update(
            answer_count=F('answer_count') - 1
        )

    answer.save()
    try:
        if action in ('hide', 'delete'):
            from notifications.services import create_notification
            create_notification(
                receiver_id=answer.author_id,
                title="Câu trả lời của bạn đã bị xử lý",
                message="Câu trả lời của bạn đã bị gỡ do vi phạm chính sách.",
                type='other',
                related_id=answer.id,
                notification_code='answer_moderated',
            )
    except Exception:
        pass
    return answer


def delete_answer(answer_id, actor):
    from questions.models import Question
    try:
        answer = Answer.objects.get(id=answer_id, is_deleted=False)
    except Answer.DoesNotExist:
        raise NotFound("Answer not found.")
    if answer.author_id != actor.id and not _is_admin(actor):
        raise PermissionDenied("Bạn không có quyền xóa câu trả lời này.")
    question_id = answer.question_id
    with transaction.atomic():
        answer.is_deleted = True
        answer.deleted_at = timezone.now()
        answer.deleted_by = actor
        answer.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
        Question.objects.filter(id=question_id).update(answer_count=F('answer_count') - 1)
    _broadcast_qa(question_id, 'answer_deleted', {'answer_id': answer_id})
    return {'message': 'Answer deleted successfully'}
