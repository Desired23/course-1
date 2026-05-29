from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Answer
from .serializers import AnswerSerializer


def _is_admin(user):
    return bool(getattr(user, 'admin', None))


def create_answer(data, author):
    try:
        from questions.models import Question
        question_id = data.get('question')
        if not question_id:
            raise ValidationError({'error': 'question is required'})
        if not Question.objects.filter(id=question_id, is_deleted=False, status='open').exists():
            raise ValidationError({'error': 'Question not found or is not open'})

        payload = dict(data)
        payload.pop('author', None)
        serializer = AnswerSerializer(data=payload)
        if serializer.is_valid():
            answer = serializer.save(author=author)
            Question.objects.filter(id=question_id).update(answer_count=F('answer_count') + 1)
            return AnswerSerializer(answer).data
        raise ValidationError(serializer.errors)
    except ValidationError as e:
        raise ValidationError({'error': str(e)})


def get_answers_by_question_id(question_id):
    return Answer.objects.filter(
        question_id=question_id,
        is_deleted=False,
        status='active',
    ).order_by('-is_accepted', '-score', 'created_at')


def update_answer(answer_id, data, actor):
    try:
        answer = Answer.objects.get(id=answer_id, is_deleted=False)
        if answer.author_id != actor.id and not _is_admin(actor):
            raise ValidationError({'error': 'Bạn không có quyền chỉnh sửa câu trả lời này.'})
        payload = dict(data)
        payload.pop('author', None)
        serializer = AnswerSerializer(answer, data=payload, partial=True)
        if serializer.is_valid():
            return AnswerSerializer(serializer.save()).data
        raise ValidationError(serializer.errors)
    except Answer.DoesNotExist:
        raise ValidationError({'error': 'Answer not found'})
    except ValidationError as e:
        raise ValidationError({'error': str(e)})


def delete_answer(answer_id, actor):
    try:
        from questions.models import Question
        answer = Answer.objects.get(id=answer_id, is_deleted=False)
        if answer.author_id != actor.id and not _is_admin(actor):
            raise ValidationError({'error': 'Bạn không có quyền xóa câu trả lời này.'})
        answer.is_deleted = True
        answer.deleted_at = timezone.now()
        answer.deleted_by = actor
        answer.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
        Question.objects.filter(id=answer.question_id).update(answer_count=F('answer_count') - 1)
        return {'message': 'Answer deleted successfully'}
    except Answer.DoesNotExist:
        raise ValidationError({'error': 'Answer not found'})
    except ValidationError as e:
        raise ValidationError({'error': str(e)})
