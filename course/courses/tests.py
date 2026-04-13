from decimal import Decimal

import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from admins.models import Admin
from categories.models import Category
from courses.models import Course
from enrollments.models import Enrollment
from instructors.models import Instructor
from reviews.models import Review
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


class CourseStudentsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create(
            username='admin-pagination',
            email='admin.pagination@example.com',
            password_hash=make_password('Password123'),
            full_name='Admin Pagination',
            user_type='admin',
            status='active',
        )
        Admin.objects.create(user=self.admin_user, department='IT', role='super_admin')
        token = build_access_token(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        instructor_user = User.objects.create(
            username='course-inst',
            email='course.inst@example.com',
            password_hash=make_password('Password123'),
            full_name='Course Instructor',
            user_type='instructor',
            status='active',
        )
        self.instructor = Instructor.objects.create(user=instructor_user)
        self.category = Category.objects.create(name='Programming', status='active')
        self.course = Course.objects.create(
            title='Admin Course',
            instructor=self.instructor,
            category=self.category,
            status='published',
            is_public=True,
        )

        self.student_one = User.objects.create(
            username='course-student-one',
            email='course.student.one@example.com',
            password_hash=make_password('Password123'),
            full_name='Course Student One',
            user_type='student',
            status='active',
        )
        self.student_two = User.objects.create(
            username='course-student-two',
            email='course.student.two@example.com',
            password_hash=make_password('Password123'),
            full_name='Course Student Two',
            user_type='student',
            status='active',
        )

        Enrollment.objects.create(
            user=self.student_one,
            course=self.course,
            progress=Decimal('35.00'),
            status=Enrollment.Status.Active,
            enrollment_date=timezone.now(),
            last_access_date=timezone.now(),
        )
        Enrollment.objects.create(
            user=self.student_two,
            course=self.course,
            progress=Decimal('90.00'),
            status=Enrollment.Status.Complete,
            enrollment_date=timezone.now(),
            last_access_date=timezone.now(),
        )
        Review.objects.create(
            course=self.course,
            user=self.student_two,
            rating=5,
            comment='Great course',
            status=Review.StatusChoices.APPROVED,
        )

    def test_returns_paginated_course_students_shape(self):
        response = self.client.get(f'/api/courses/{self.course.id}/students/', {'page': 1, 'page_size': 1})

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(response.data['total_pages'], 2)
        self.assertEqual(len(response.data['results']), 1)

    def test_includes_study_time_and_rating_fields(self):
        response = self.client.get(f'/api/courses/{self.course.id}/students/')

        self.assertEqual(response.status_code, 200, response.content)
        row = response.data['results'][0]
        self.assertIn('study_time_minutes', row)
        self.assertIn('rating', row)
