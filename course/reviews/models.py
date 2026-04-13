from django.db import models
from courses.models import Course
from users.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class Review(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'pending'
        APPROVED = 'approved', 'approved'
        REJECTED = 'rejected', 'rejected'

    id = models.AutoField(primary_key=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE,related_name='reviews_course')
    user = models.ForeignKey(User, on_delete=models.CASCADE,related_name='reviews_user')

    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])

    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_reviews')
    is_deleted = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=StatusChoices, default=StatusChoices.PENDING)
    likes = models.PositiveIntegerField(default=0)
    report_count = models.PositiveIntegerField(default=0)
    last_report_reason = models.TextField(blank=True, null=True)
    last_reported_at = models.DateTimeField(blank=True, null=True)
    instructor_response = models.TextField(blank=True, null=True)
    response_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Review by {self.user} for {self.course}'
