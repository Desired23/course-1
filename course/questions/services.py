from django.db.models import Q, F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Question
from .serializers import QuestionSerializer


def _is_admin(user):
    return bool(getattr(user, 'admin', None))


def create_question(data, author):
    try:
        payload = dict(data)
        payload.pop('author', None)
        serializer = QuestionSerializer(data=payload)
        if serializer.is_valid():
            question = serializer.save(author=author)
            return QuestionSerializer(question).data
        raise ValidationError(serializer.errors)
    except ValidationError as e:
        raise ValidationError({'error': str(e)})


def get_question_by_id(question_id):
    try:
        question = Question.objects.get(id=question_id, is_deleted=False)
        return QuestionSerializer(question).data
    except Question.DoesNotExist:
        raise ValidationError({'error': 'Question not found'})


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
        if question.author_id != actor.id and not _is_admin(actor):
            raise ValidationError({'error': 'Bạn không có quyền chỉnh sửa câu hỏi này.'})
        payload = dict(data)
        payload.pop('author', None)
        serializer = QuestionSerializer(question, data=payload, partial=True)
        if serializer.is_valid():
            return QuestionSerializer(serializer.save()).data
        raise ValidationError(serializer.errors)
    except Question.DoesNotExist:
        raise ValidationError({'error': 'Question not found'})
    except ValidationError as e:
        raise ValidationError({'error': str(e)})


def delete_question(question_id, actor):
    try:
        question = Question.objects.get(id=question_id, is_deleted=False)
        if question.author_id != actor.id and not _is_admin(actor):
            raise ValidationError({'error': 'Bạn không có quyền xóa câu hỏi này.'})
        question.is_deleted = True
        question.deleted_at = timezone.now()
        question.deleted_by = actor
        question.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
        return {'message': 'Question deleted successfully'}
    except Question.DoesNotExist:
        raise ValidationError({'error': 'Question not found'})
    except ValidationError as e:
        raise ValidationError({'error': str(e)})


def increase_question_views(question_id):
    updated = Question.objects.filter(id=question_id, is_deleted=False).update(views=F('views') + 1)
    if not updated:
        raise ValidationError({'error': 'Question not found'})
    return {'message': 'Views updated'}


def report_question(question_id, reason=''):
    try:
        question = Question.objects.get(id=question_id, is_deleted=False)
        question.report_count += 1
        question.last_report_reason = (reason or '').strip() or question.last_report_reason
        question.last_reported_at = timezone.now()
        question.save(update_fields=['report_count', 'last_report_reason', 'last_reported_at'])
        return QuestionSerializer(question).data
    except Question.DoesNotExist:
        raise ValidationError({'error': 'Question not found'})


def moderate_question(question_id, action, reason=''):
    try:
        question = Question.objects.get(id=question_id)
    except Question.DoesNotExist:
        raise ValidationError({'error': 'Question not found'})

    action = (action or '').strip().lower()
    if action == 'approve':
        question.status = 'open'
        question.report_count = 0
    elif action == 'dismiss':
        question.report_count = 0
    elif action == 'close':
        question.status = 'closed'
        question.report_count = 0
    elif action == 'delete':
        question.is_deleted = True
        question.deleted_at = timezone.now()
        question.report_count = 0
    else:
        raise ValidationError({'error': 'Invalid action. Use: approve, dismiss, close, delete'})

    if reason:
        question.last_report_reason = reason.strip()
    question.save()
    return QuestionSerializer(question).data


def accept_answer(question_id, answer_id, actor):
    """Admin marks an answer as accepted for a question."""
    try:
        from answers.models import Answer
        question = Question.objects.get(id=question_id, is_deleted=False)
        # Unset any previously accepted answer for this question
        Answer.objects.filter(question=question, is_accepted=True).update(is_accepted=False)
        # Set the new accepted answer
        answer = Answer.objects.get(id=answer_id, question=question, is_deleted=False)
        answer.is_accepted = True
        answer.save(update_fields=['is_accepted'])
        return QuestionSerializer(question).data
    except Question.DoesNotExist:
        raise ValidationError({'error': 'Question not found'})
    except Answer.DoesNotExist:
        raise ValidationError({'error': 'Answer not found or does not belong to this question'})
