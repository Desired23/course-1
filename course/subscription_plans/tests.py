from decimal import Decimal

import jwt
from django.conf import settings
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from categories.models import Category
from courses.models import Course
from instructors.models import Instructor
from subscription_plans.models import SubscriptionPlan, UserSubscription
from subscription_plans.serializers import UserSubscriptionListSerializer
from users.models import User


def build_access_token(user):
	payload = {
	 "user_id": user.id,
	 "username": user.username,
	 "email": user.email,
	 "user_type": [user.user_type],
	 "token_type": "access",
	 "exp": 9999999999,
	 "iat": 1,
	}
	return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


class UserSubscriptionListSerializerTests(TestCase):
	def test_includes_plan_detail_for_frontend_card(self):
		user = User.objects.create(
		 username='sub-user',
		 email='sub-user@example.com',
		 password_hash='hashed',
		 full_name='Subscription User',
		 user_type='student',
		)
		plan = SubscriptionPlan.objects.create(
		 name='Pro Plan',
		 description='Pro access',
		 price=Decimal('299000.00'),
		 discount_price=Decimal('199000.00'),
		 duration_type='monthly',
		 duration_days=30,
		 status='active',
		 features=['A', 'B'],
		 icon='Zap',
		 highlight_color='blue',
		)
		subscription = UserSubscription.objects.create(
		 user=user,
		 plan=plan,
		 status='active',
		 start_date=timezone.now(),
		 end_date=timezone.now() + timezone.timedelta(days=30),
		 auto_renew=True,
		)

		payload = UserSubscriptionListSerializer(subscription).data

		self.assertIn('plan_detail', payload)
		self.assertEqual(payload['plan_detail']['id'], plan.id)
		self.assertEqual(payload['plan_detail']['name'], 'Pro Plan')
		self.assertEqual(payload['plan_detail']['icon'], 'Zap')


class UserSubscriptionCoursesApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create(
		 username='student-sub',
		 email='student-sub@example.com',
		 password_hash='hashed',
		 full_name='Student Subscription',
		 user_type='student',
		 status='active',
		)
		token = build_access_token(self.user)
		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

		instructor_user = User.objects.create(
		 username='inst-sub',
		 email='inst-sub@example.com',
		 password_hash='hashed',
		 full_name='Instructor One',
		 user_type='instructor',
		 status='active',
		)
		instructor = Instructor.objects.create(user=instructor_user)
		category = Category.objects.create(name='Sub Cat', status='active')

		self.plan = SubscriptionPlan.objects.create(
		 name='Plan A',
		 price=Decimal('300000.00'),
		 duration_type='monthly',
		 duration_days=30,
		 status='active',
		)
		self.course_python = Course.objects.create(
		 title='Python for Analysts',
		 instructor=instructor,
		 category=category,
		 status='published',
		 is_public=True,
		)
		self.course_sql = Course.objects.create(
		 title='SQL for Reports',
		 instructor=instructor,
		 category=category,
		 status='published',
		 is_public=True,
		)

		UserSubscription.objects.create(
		 user=self.user,
		 plan=self.plan,
		 status='active',
		 start_date=timezone.now(),
		 end_date=timezone.now() + timezone.timedelta(days=30),
		)
		self.plan.plan_courses.create(course=self.course_python, status='active')
		self.plan.plan_courses.create(course=self.course_sql, status='active')

	def test_returns_paginated_results_shape(self):
		response = self.client.get('/api/subscriptions/me/courses/?page=1&page_size=1')

		self.assertEqual(response.status_code, 200, response.content)
		self.assertIn('results', response.data)
		self.assertEqual(response.data.get('count'), 2)
		self.assertEqual(response.data.get('total_pages'), 2)
		self.assertEqual(len(response.data.get('results', [])), 1)

	def test_supports_search_by_course_title(self):
		response = self.client.get('/api/subscriptions/me/courses/?search=python')

		self.assertEqual(response.status_code, 200, response.content)
		results = response.data.get('results', [])
		self.assertEqual(len(results), 1)
		self.assertEqual(results[0].get('course_title'), 'Python for Analysts')

	def test_excludes_expired_subscriptions_courses(self):
		expired_plan = SubscriptionPlan.objects.create(
		 name='Expired Plan',
		 price=Decimal('100000.00'),
		 duration_type='monthly',
		 duration_days=30,
		 status='active',
		)
		expired_course = Course.objects.create(
		 title='Legacy Course',
		 instructor=self.course_python.instructor,
		 category=self.course_python.category,
		 status='published',
		 is_public=True,
		)
		UserSubscription.objects.create(
		 user=self.user,
		 plan=expired_plan,
		 status='active',
		 start_date=timezone.now() - timezone.timedelta(days=60),
		 end_date=timezone.now() - timezone.timedelta(days=1),
		)
		expired_plan.plan_courses.create(course=expired_course, status='active')

		response = self.client.get('/api/subscriptions/me/courses/')

		self.assertEqual(response.status_code, 200, response.content)
		self.assertEqual(response.data.get('count'), 2)
		titles = {item.get('course_title') for item in response.data.get('results', [])}
		self.assertNotIn('Legacy Course', titles)
