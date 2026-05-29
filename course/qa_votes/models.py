from django.db import models
from users.models import User


class QuestionVote(models.Model):
    VOTE_CHOICES = [('up', 'up'), ('down', 'down')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='question_votes')
    question = models.ForeignKey(
        'questions.Question', on_delete=models.CASCADE, related_name='votes_question'
    )
    vote_type = models.CharField(max_length=4, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'QuestionVotes'
        unique_together = ('user', 'question')

    def __str__(self):
        return f"{self.user_id} {self.vote_type} Question {self.question_id}"


class AnswerVote(models.Model):
    VOTE_CHOICES = [('up', 'up'), ('down', 'down')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='answer_votes')
    answer = models.ForeignKey(
        'answers.Answer', on_delete=models.CASCADE, related_name='votes_answer'
    )
    vote_type = models.CharField(max_length=4, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'AnswerVotes'
        unique_together = ('user', 'answer')

    def __str__(self):
        return f"{self.user_id} {self.vote_type} Answer {self.answer_id}"
