from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from users.models import User
from users.services import _issue_auth_tokens

from .models import SearchEvent
from .services import get_popular_searches


class SearchSuggestionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            username='searcher',
            email='searcher@example.com',
            password_hash='hashed',
            full_name='Searcher',
            user_type=User.UserTypeChoices.STUDENT,
            status=User.StatusChoices.ACTIVE,
        )
        tokens = _issue_auth_tokens(self.user)
        self.auth_header = f"Bearer {tokens['access_token']}"

    def test_authenticated_suggestions_return_recent_unique_searches(self):
        SearchEvent.objects.create(user=self.user, raw_query='Python', normalized_query='python', source='global_search')
        SearchEvent.objects.create(user=self.user, raw_query='React', normalized_query='react', source='global_search')
        SearchEvent.objects.create(user=self.user, raw_query='python ', normalized_query='python', source='global_search')
        SearchEvent.objects.create(raw_query='Django', normalized_query='django', source='global_search')

        response = self.client.get('/api/search/suggestions/', HTTP_AUTHORIZATION=self.auth_header)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['recent_searches'], ['python ', 'React'])

    def test_anonymous_suggestions_hide_recent_searches(self):
        SearchEvent.objects.create(raw_query='Python', normalized_query='python', source='global_search')

        response = self.client.get('/api/search/suggestions/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['recent_searches'], [])
        self.assertEqual(response.data['popular_searches'], ['Python'])

    def test_track_rejects_blank_query(self):
        response = self.client.post('/api/search/track/', {'query': ' ', 'source': 'global_search'}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('query', response.data['errors'])

    def test_popular_searches_use_case_insensitive_aggregation_and_window(self):
        first_python = SearchEvent.objects.create(raw_query='Python', normalized_query='python', source='global_search')
        python_advanced = SearchEvent.objects.create(raw_query='python advanced', normalized_query='python advanced', source='global_search')
        latest_python = SearchEvent.objects.create(raw_query='PYTHON', normalized_query='python', source='global_search')
        stale = SearchEvent.objects.create(raw_query='Old Query', normalized_query='old query', source='global_search')
        SearchEvent.objects.filter(id=first_python.id).update(created_at=timezone.now() - timedelta(days=2))
        SearchEvent.objects.filter(id=python_advanced.id).update(created_at=timezone.now() - timedelta(days=3))
        SearchEvent.objects.filter(id=stale.id).update(created_at=timezone.now() - timedelta(days=31))
        SearchEvent.objects.filter(id=latest_python.id).update(created_at=timezone.now() - timedelta(days=1))

        popular = get_popular_searches()

        self.assertEqual(popular[0], 'PYTHON')
        self.assertNotIn('Old Query', popular)
