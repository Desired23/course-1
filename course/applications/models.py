from django.db import models
from users.models import User
from registration_forms.models import RegistrationForm, FormQuestion


class Application(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        CHANGES_REQUESTED = 'changes_requested', 'Changes Requested'

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='applications'
    )
    form = models.ForeignKey(
        RegistrationForm, on_delete=models.CASCADE,
        related_name='applications'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.PENDING
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_applications'
    )
    admin_notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'applications'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Application #{self.id} by User {self.user_id} - {self.status}"


class ApplicationResponse(models.Model):
    id = models.AutoField(primary_key=True)
    application = models.ForeignKey(
        Application, on_delete=models.CASCADE,
        related_name='responses'
    )
    question = models.ForeignKey(
        FormQuestion, on_delete=models.CASCADE,
        related_name='responses'
    )
    value = models.JSONField()

    class Meta:
        db_table = 'application_responses'
        unique_together = ('application', 'question')
