from decimal import Decimal

import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from categories.models import Category
from coursemodules.models import CourseModule
from courses.models import Course
from enrollments.models import Enrollment
from instructors.models import Instructor
from lessons.models import Lesson
from lesson_attachments.models import LessonAttachment
from users.models import User


def build_access_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': [user.user_type],
        'token_type': 'access',
        'exp': 9999999999,
        'iat': 1,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


class LessonAttachmentDownloadTests(TestCase):
    def setUp(self):
        instructor_user = User.objects.create(
            username='attachment-inst',
            email='attachment.inst@example.com',
            password_hash=make_password('Password123'),
            full_name='Attachment Instructor',
            user_type='instructor',
            status='active',
        )
        instructor = Instructor.objects.create(user=instructor_user)
        category = Category.objects.create(name='Attachment Category', status='active')
        course = Course.objects.create(
            title='Attachment Course',
            instructor=instructor,
            category=category,
            status='published',
            is_public=True,
        )
        module = CourseModule.objects.create(
            course=course,
            title='Module 1',
            order_number=1,
            status='Published',
        )
        lesson = Lesson.objects.create(
            coursemodule=module,
            title='Lesson 1',
            content_type=Lesson.ContentType.VIDEO,
            duration=10,
            order=1,
            status=Lesson.Status.PUBLISHED,
        )
        self.attachment = LessonAttachment.objects.create(
            lesson=lesson,
            title='Resource for Lesson 1',
            file_path='/uploads/resources/1_1_1.pdf',
            file_type='application/pdf',
            file_size=150000,
        )
        self.student = User.objects.create(
            username='attachment-student',
            email='attachment.student@example.com',
            password_hash=make_password('Password123'),
            full_name='Attachment Student',
            user_type='student',
            status='active',
        )
        Enrollment.objects.create(
            user=self.student,
            course=course,
            progress=Decimal('0.00'),
            status=Enrollment.Status.Active,
            enrollment_date=timezone.now(),
        )
        self.client = APIClient()

    def authenticate(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {build_access_token(user)}')

    def test_seed_resource_download_returns_pdf_and_counts_download(self):
        self.authenticate(self.student)

        response = self.client.get(f'/api/attachments/{self.attachment.id}/download/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('1_1_1.pdf', response['Content-Disposition'])
        self.assertTrue(b''.join(response.streaming_content).startswith(b'%PDF'))
        self.attachment.refresh_from_db()
        self.assertEqual(self.attachment.download_count, 1)

    def test_download_requires_course_access(self):
        other_student = User.objects.create(
            username='attachment-other',
            email='attachment.other@example.com',
            password_hash=make_password('Password123'),
            full_name='Attachment Other',
            user_type='student',
            status='active',
        )
        self.authenticate(other_student)

        response = self.client.get(f'/api/attachments/{self.attachment.id}/download/')

        self.assertEqual(response.status_code, 403, response.content)
        self.attachment.refresh_from_db()
        self.assertEqual(self.attachment.download_count, 0)
