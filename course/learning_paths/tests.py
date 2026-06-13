from django.test import SimpleTestCase

from courses.models import Course

from .services import (
    retrieve_courses_for_advisor,
    sanitize_advisor_messages,
    validate_advisor_payload,
    validate_retrieval_plan,
)


def catalog_course(course_id, title, **overrides):
    data = {
        'course_id': course_id,
        'title': title,
        'shortdescription': '',
        'description': '',
        'level': Course.Level.BEGINNER,
        'course_price': '0.00',
        'course_discount_price': None,
        'course_discount_start_date': None,
        'course_discount_end_date': None,
        'duration_hours': 1,
        'language': 'Vietnamese',
        'rating': '4.5',
        'total_students': 0,
        'has_certificate': False,
        'instructor_name': '',
        'target_audience': [],
        'learning_objectives': [],
        'tags': [],
        'category_name': '',
        'subcategory_name': '',
    }
    data.update(overrides)
    return data


class AdvisorRetrievalPlanTests(SimpleTestCase):
    def setUp(self):
        self.catalog = [
            catalog_course(
                1,
                'Node.js Backend Master',
                level=Course.Level.INTERMEDIATE,
                tags=['Node.js', 'Express', 'JavaScript'],
                category_name='Programming',
                total_students=20,
            ),
            catalog_course(
                2,
                'Python from Beginner to Advanced',
                tags=['Python'],
                category_name='Programming',
                total_students=100,
            ),
            catalog_course(
                3,
                'TOEIC 800+ Preparation',
                tags=['TOEIC', 'English'],
                category_name='Language',
                total_students=50,
            ),
        ]

    def test_validates_filter_plan_schema(self):
        plan = validate_retrieval_plan({
            'action': 'retrieve_courses',
            'response_type': 'course_list',
            'query': 'nodejs',
            'topics': ['node.js', 'express'],
            'filters': {'levels': ['all_levels'], 'max_effective_price': None},
            'sort': 'relevance',
            'limit': 100,
        })

        self.assertEqual(plan['action'], 'retrieve_courses')
        self.assertEqual(plan['response_type'], 'course_list')
        self.assertEqual(plan['limit'], 40)
        self.assertEqual(plan['filters']['levels'], [Course.Level.ALL_LEVELS])

    def test_validates_source_course_ids_from_gemini_plan(self):
        plan = validate_retrieval_plan({
            'action': 'retrieve_courses',
            'response_type': 'path',
            'source_course_ids': [872, '873', 'bad', 872],
            'limit': 20,
        })

        self.assertEqual(plan['source_course_ids'], [872, 873])

    def test_retrieves_courses_from_gemini_filter_plan(self):
        plan = validate_retrieval_plan({
            'action': 'retrieve_courses',
            'response_type': 'course_list',
            'query': 'nodejs backend',
            'topics': ['node.js', 'express', 'javascript'],
            'filters': {'levels': ['all_levels']},
            'sort': 'relevance',
            'limit': 20,
        })

        courses = retrieve_courses_for_advisor(self.catalog, plan)

        self.assertEqual([course['course_id'] for course in courses], [1])

    def test_retrieves_toeic_followup_topic(self):
        plan = validate_retrieval_plan({
            'action': 'retrieve_courses',
            'response_type': 'course_list',
            'query': 'toeic',
            'topics': ['toeic', 'english'],
            'filters': {},
            'sort': 'relevance',
            'limit': 20,
        })

        courses = retrieve_courses_for_advisor(self.catalog, plan)

        self.assertEqual([course['course_id'] for course in courses], [3])

    def test_applies_budget_filter(self):
        catalog = [
            catalog_course(1, 'Affordable Python', tags=['Python'], course_price='300000.00'),
            catalog_course(2, 'Premium Python', tags=['Python'], course_price='900000.00'),
        ]
        plan = validate_retrieval_plan({
            'action': 'retrieve_courses',
            'response_type': 'course_list',
            'query': 'python',
            'topics': ['python'],
            'filters': {'max_effective_price': 500000},
            'sort': 'price_asc',
            'limit': 20,
        })

        courses = retrieve_courses_for_advisor(catalog, plan)

        self.assertEqual([course['course_id'] for course in courses], [1])

    def test_sanitizes_course_list_summary_that_looks_like_path(self):
        payload = {
            'type': 'course_list',
            'summary': '| Buoc | course_id | Khoa hoc | Uoc tinh | Co the bo qua |',
            'courses': [
                {'course_id': 1, 'order': 1, 'reason': 'Relevant', 'is_skippable': False},
            ],
        }

        validated = validate_advisor_payload(payload, self.catalog)

        self.assertNotIn('Buoc', validated['summary'])
        self.assertEqual(validated['courses'][0]['course_id'], 1)

    def test_sanitizes_structured_artifact_course_ids(self):
        messages = [
            {
                'role': 'assistant',
                'content': 'I found Python courses.',
                'artifact': {
                    'type': 'course_list',
                    'course_ids': [872, '873', 'bad', 872],
                },
            },
            {'role': 'user', 'content': 'turn this into a beginner path'},
        ]

        sanitized = sanitize_advisor_messages(messages)

        self.assertEqual(sanitized[0]['artifact']['course_ids'], [872, 873])
