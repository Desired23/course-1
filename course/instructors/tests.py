from decimal import Decimal

import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from courses.models import Course
from enrollments.models import Enrollment
from instructors.models import Instructor
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


class InstructorStudentsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor_user = User.objects.create(
            username='inst-pagination',
            email='inst-pagination@example.com',
            password_hash=make_password('Password123'),
            full_name='Instructor Pagination',
            user_type='instructor',
            status='active',
        )
        self.instructor = Instructor.objects.create(user=self.instructor_user)
        token = build_access_token(self.instructor_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        self.course_one = Course.objects.create(
            title='Course One',
            instructor=self.instructor,
            status='published',
        )
        self.course_two = Course.objects.create(
            title='Course Two',
            instructor=self.instructor,
            status='published',
        )

        self.student_one = User.objects.create(
            username='student-one',
            email='student.one@example.com',
            password_hash=make_password('Password123'),
            full_name='Alice Student',
            user_type='student',
            status='active',
        )
        self.student_two = User.objects.create(
            username='student-two',
            email='student.two@example.com',
            password_hash=make_password('Password123'),
            full_name='Bob Student',
            user_type='student',
            status='active',
        )

        Enrollment.objects.create(
            user=self.student_one,
            course=self.course_one,
            progress=Decimal('45.00'),
            status=Enrollment.Status.Active,
            enrollment_date=timezone.now(),
            last_access_date=timezone.now(),
        )
        Enrollment.objects.create(
            user=self.student_two,
            course=self.course_two,
            progress=Decimal('80.00'),
            status=Enrollment.Status.Complete,
            enrollment_date=timezone.now(),
            last_access_date=timezone.now(),
        )

    def test_returns_paginated_students_shape(self):
        response = self.client.get('/api/instructor/students/', {'page': 1, 'page_size': 1})

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(response.data['total_pages'], 2)
        self.assertEqual(len(response.data['results']), 1)

    def test_supports_search_and_status_filters(self):
        response = self.client.get('/api/instructor/students/', {'search': 'alice', 'status': 'active'})

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['full_name'], 'Alice Student')
