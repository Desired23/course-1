from django.db import models
from users.models import User
from qnas.models import QnA

class QnAAnswer(models.Model):
    id = models.AutoField(primary_key=True)
    qna = models.ForeignKey(QnA, on_delete=models.CASCADE, related_name='answwer_qna')
    answer = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='answer_user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_qna_answers')
    is_deleted = models.BooleanField(default=False)
    is_accepted = models.BooleanField(default=False)
    likes = models.IntegerField(default=0)

    class Meta:
        db_table = 'QnAAnswers'

    def __str__(self):
        return f"Answer {self.id}: QnA {self.qna.id}: User {self.user.id}"
