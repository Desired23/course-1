from django.db.models import F
from rest_framework.exceptions import ValidationError

from .models import QuestionVote, AnswerVote


def vote_question(user, question_id, vote_type):
    from questions.models import Question
    try:
        question = Question.objects.get(id=question_id, is_deleted=False)
    except Question.DoesNotExist:
        raise ValidationError({'error': 'Question not found'})

    try:
        existing = QuestionVote.objects.get(user=user, question=question)
        if existing.vote_type == vote_type:
            # Toggle off: remove the vote
            delta = -1 if vote_type == 'up' else 1
            existing.delete()
            user_vote = None
        else:
            # Switch direction
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
    return {'score': question.score, 'user_vote': user_vote}


def vote_answer(user, answer_id, vote_type):
    from answers.models import Answer
    try:
        answer = Answer.objects.get(id=answer_id, is_deleted=False)
    except Answer.DoesNotExist:
        raise ValidationError({'error': 'Answer not found'})

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
    return {'score': answer.score, 'user_vote': user_vote}
