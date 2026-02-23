import uuid
from django.db import models
from users.models import User
from courses.models import Course
from enrollments.models import Enrollment


class Certificate(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='certificates'
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE,
        related_name='certificates'
    )
    enrollment = models.OneToOneField(
        Enrollment, on_delete=models.CASCADE,
        related_name='certificate_record'
    )
    verification_code = models.CharField(
        max_length=36, unique=True, default=uuid.uuid4
    )
    certificate_url = models.CharField(max_length=500, blank=True, null=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='revoked_certificates'
    )

    student_name = models.CharField(max_length=255)
    course_title = models.CharField(max_length=255)
    instructor_name = models.CharField(max_length=255, blank=True, null=True)
    completion_date = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'certificates'
        ordering = ['-issued_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'course'],
                name='unique_user_course_certificate'
            )
        ]

    def __str__(self):
        return f"Certificate {self.verification_code} - {self.student_name} - {self.course_title}"
