from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import QuestionVote, AnswerVote


def _broadcast_qa(question_id, action, payload):
    channel_layer = get_channel_layer()
    if not channel_layer or not question_id:
        return
    async_to_sync(channel_layer.group_send)(
        f"question_{question_id}",
        {"type": "send_qa_update", "data": {"action": action, **payload}},
    )


def vote_question(user, question_id, vote_type):
    from questions.models import Question
    try:
        question = Question.objects.get(id=question_id, is_deleted=False)
    except Question.DoesNotExist:
        raise ValidationError({'error': 'Question not found'})

    with transaction.atomic():
        try:
            existing = QuestionVote.objects.get(user=user, question=question)
            if existing.vote_type == vote_type:
                delta = -1 if vote_type == 'up' else 1
                existing.delete()
                user_vote = None
            else:
                delta = 2 if vote_type == 'up' else -2
                existing.vote_type = vote_type
                existing.save(update_fields=['vote_type'])
                user_vote = vote_type
        except QuestionVote.DoesNotExist:
            delta = 1 if vote_type == 'up' else -1
            QuestionVote.objects.create(user=user, question=question, vote_type=vote_type)
            user_vote = vote_type

        Question.objects.filter(id=question_id).update(score=F('score') + delta)
    question.refresh_from_db(fields=['score'])
    _broadcast_qa(question_id, 'question_voted', {'question_id': question_id, 'score': question.score})
    return {'score': question.score, 'user_vote': user_vote}


def vote_answer(user, answer_id, vote_type):
    from answers.models import Answer
    try:
        answer = Answer.objects.get(id=answer_id, is_deleted=False)
    except Answer.DoesNotExist:
        raise ValidationError({'error': 'Answer not found'})

    with transaction.atomic():
        try:
            existing = AnswerVote.objects.get(user=user, answer=answer)
            if existing.vote_type == vote_type:
                delta = -1 if vote_type == 'up' else 1
                existing.delete()
                user_vote = None
            else:
                delta = 2 if vote_type == 'up' else -2
                existing.vote_type = vote_type
                existing.save(update_fields=['vote_type'])
                user_vote = vote_type
        except AnswerVote.DoesNotExist:
            delta = 1 if vote_type == 'up' else -1
            AnswerVote.objects.create(user=user, answer=answer, vote_type=vote_type)
            user_vote = vote_type

        Answer.objects.filter(id=answer_id).update(score=F('score') + delta)
    answer.refresh_from_db(fields=['score'])
    _broadcast_qa(answer.question_id, 'answer_voted', {'answer_id': answer_id, 'score': answer.score})
    return {'score': answer.score, 'user_vote': user_vote}
