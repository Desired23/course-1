from django.db import models
from users.models import User


class RegistrationForm(models.Model):
    class FormType(models.TextChoices):
        INSTRUCTOR_APPLICATION = 'instructor_application', 'Instructor Application'
        USER_REGISTRATION = 'user_registration', 'User Registration'

    id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=30, choices=FormType.choices)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    version = models.IntegerField(default=1)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_registration_forms'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'registration_forms'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (v{self.version}) - {self.type}"


class FormQuestion(models.Model):
    class QuestionType(models.TextChoices):
        TEXT = 'text', 'Text'
        TEXTAREA = 'textarea', 'Textarea'
        NUMBER = 'number', 'Number'
        SELECT = 'select', 'Select'
        RADIO = 'radio', 'Radio'
        CHECKBOX = 'checkbox', 'Checkbox'
        FILE = 'file', 'File Upload'
        URL = 'url', 'URL'

    id = models.AutoField(primary_key=True)
    form = models.ForeignKey(
        RegistrationForm, on_delete=models.CASCADE,
        related_name='questions'
    )
    order = models.IntegerField(default=0)
    label = models.CharField(max_length=500)
    type = models.CharField(max_length=20, choices=QuestionType.choices)
    placeholder = models.CharField(max_length=255, blank=True, null=True)
    help_text = models.CharField(max_length=500, blank=True, null=True)
    required = models.BooleanField(default=False)

    options = models.JSONField(blank=True, null=True)
    validation_regex = models.CharField(max_length=500, blank=True, null=True)
    file_config = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'form_questions'
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.label} ({self.type})"
