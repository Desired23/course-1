from django.test import TestCase
from rest_framework.test import APIClient

from courses.models import Course
from reviews.models import Review
from users.models import User


class HomepageReviewListViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.course = Course.objects.create(
            title='Django Basics',
            status=Course.Status.PUBLISHED,
        )
        self.user = User.objects.create(
            username='student',
            email='student@example.com',
            password_hash='hash',
            full_name='Student One',
            user_type=User.UserTypeChoices.STUDENT,
        )

    def _review(self, **kwargs):
        defaults = {
            'course': self.course,
            'user': self.user,
            'rating': 5,
            'comment': 'Great course',
            'status': Review.StatusChoices.APPROVED,
        }
        defaults.update(kwargs)
        return Review.objects.create(**defaults)

    def test_homepage_reviews_only_return_approved_selected_reviews_in_order(self):
        first = self._review(comment='First approved')
        pending = self._review(comment='Pending review', status=Review.StatusChoices.PENDING)
        deleted = self._review(comment='Deleted approved', is_deleted=True)
        second = self._review(comment='Second approved')

        response = self.client.get(
            '/api/reviews/homepage/',
            {'ids': f'{second.id},{pending.id},{first.id},{deleted.id}', 'limit': '10'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['review_id'] for item in response.data], [second.id, first.id])

    def test_homepage_reviews_exclude_empty_comments(self):
        self._review(comment='')
        visible = self._review(comment='Useful feedback')

        response = self.client.get('/api/reviews/homepage/', {'limit': '10'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['review_id'] for item in response.data], [visible.id])
