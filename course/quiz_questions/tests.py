import json
from types import SimpleNamespace

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from quiz_questions.services import _get_code_lesson_quiz


def _lesson(content_dict, title='Lesson', description='desc'):
    return SimpleNamespace(
        id=1,
        title=title,
        description=description,
        content=json.dumps(content_dict),
    )


def _question(result):
    return result['questions'][0]


class GetCodeLessonQuizExecutionModeTests(SimpleTestCase):
    def test_function_mode_returns_mode_and_name(self):
        result = _get_code_lesson_quiz(_lesson({
            'title': 'Two Sum',
            'problemStatement': {'description': 'd'},
            'executionMode': 'function',
            'functionName': 'twoSum',
            'allowedLanguages': [63],
            'testCases': [],
        }))
        q = _question(result)
        self.assertEqual(q['execution_mode'], 'function')
        self.assertEqual(q['function_name'], 'twoSum')

    def test_function_mode_missing_function_name_raises(self):
        with self.assertRaises(ValidationError):
            _get_code_lesson_quiz(_lesson({
                'problemStatement': {'description': 'd'},
                'executionMode': 'function',
                'allowedLanguages': [63],
                'testCases': [],
            }))

    def test_legacy_without_execution_mode_or_function_name_defaults_stdin(self):
        result = _get_code_lesson_quiz(_lesson({
            'problemStatement': {'description': 'd'},
            'allowedLanguages': [63],
            'testCases': [],
        }))
        self.assertEqual(_question(result)['execution_mode'], 'stdin')

    def test_legacy_with_function_name_infers_function_mode(self):
        result = _get_code_lesson_quiz(_lesson({
            'problemStatement': {'description': 'd'},
            'functionName': 'solve',
            'allowedLanguages': [71],
            'testCases': [],
        }))
        self.assertEqual(_question(result)['execution_mode'], 'function')

    def test_unsupported_languages_are_filtered_out(self):
        result = _get_code_lesson_quiz(_lesson({
            'problemStatement': {'description': 'd'},
            'executionMode': 'stdin',
            'allowedLanguages': [63, 62, 54, 71, 74],  # 62=Java, 54=C++ removed
            'testCases': [],
        }))
        self.assertEqual(sorted(_question(result)['allowed_languages']), [63, 71, 74])

    def test_empty_languages_after_filter_defaults_to_javascript(self):
        result = _get_code_lesson_quiz(_lesson({
            'problemStatement': {'description': 'd'},
            'executionMode': 'stdin',
            'allowedLanguages': [62, 54],  # all unsupported
            'testCases': [],
        }))
        self.assertEqual(_question(result)['allowed_languages'], [63])


class GetCodeLessonQuizPayloadTests(SimpleTestCase):
    def test_test_cases_are_mapped(self):
        result = _get_code_lesson_quiz(_lesson({
            'problemStatement': {'description': 'd'},
            'allowedLanguages': [63],
            'testCases': [
                {'input': '1 2', 'expectedOutput': '3', 'isHidden': True},
            ],
        }))
        cases = _question(result)['test_cases']
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0]['input_data'], '1 2')
        self.assertEqual(cases[0]['expected_output'], '3')
        self.assertTrue(cases[0]['is_hidden'])

    def test_invalid_json_content_raises(self):
        with self.assertRaises(ValidationError):
            _get_code_lesson_quiz(SimpleNamespace(
                id=1, title='L', description='d', content='not-json',
            ))
