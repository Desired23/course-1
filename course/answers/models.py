from django.db import models
from users.models import User


class Answer(models.Model):
    STATUS_CHOICES = [
        ('active', 'active'),
        ('deleted', 'deleted'),
    ]

    id = models.AutoField(primary_key=True)
    question = models.ForeignKey(
        'questions.Question', on_delete=models.CASCADE, related_name='answers_question'
    )
    content = models.TextField()
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='answers_author'
    )
    is_accepted = models.BooleanField(default=False)
    score = models.IntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='deleted_answers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'Answers'

    def __str__(self):
        return f"Answer {self.id} on Question {self.question_id}"
