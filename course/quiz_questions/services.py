from rest_framework.exceptions import ValidationError
from .models import QuizQuestion, QuizTestCase
from .serializers import (
    QuizQuestionSerializer,
    LessonQuizSerializer,
    QuizQuestionForStudentSerializer,
    QuizTestCaseSerializer
)
from lessons.models import Lesson
from django.db.models import Q
from django.db import transaction

def create_quiz_question(data):
    try:

        test_cases_data = data.pop('test_cases', [])


        serializer = QuizQuestionSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            with transaction.atomic():

                quiz_question = serializer.save()


                if quiz_question.question_type == 'code' and test_cases_data:
                    for idx, test_case in enumerate(test_cases_data):
                        test_case['question'] = quiz_question.id

                        test_case['order_number'] = test_case.get('order_number', idx + 1)
                        tc_serializer = QuizTestCaseSerializer(data=test_case)
                        if tc_serializer.is_valid(raise_exception=True):
                            tc_serializer.save()
                        print ("Quiz question created with ID:")


            return QuizQuestionSerializer(quiz_question).data
        raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_quiz_questions_by_lesson(lesson_id):
    try:

        return QuizQuestion.objects.filter(
            lesson_id=lesson_id,
            is_deleted=False,
        ).order_by('order_number', 'id')
    except Exception as e:
        raise ValidationError({"error": str(e)})

def find_quiz_question_by_id(question_id):
    try:
        quiz_question = QuizQuestion.objects.get(id=question_id, is_deleted=False)
        serializer = QuizQuestionSerializer(quiz_question)
        return serializer.data
    except QuizQuestion.DoesNotExist:
        raise ValidationError({"error": "Quiz question not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def update_quiz_question(question_id, data):
    try:
        quiz_question = QuizQuestion.objects.get(id=question_id)


        test_cases_data = data.pop('test_cases', None)

        serializer = QuizQuestionSerializer(quiz_question, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            with transaction.atomic():

                updated_quiz_question = serializer.save()


                if test_cases_data is not None:

                    QuizTestCase.objects.filter(question=quiz_question).delete()


                    for idx, test_case in enumerate(test_cases_data):
                        test_case['question'] = quiz_question.id
                        test_case['order_number'] = test_case.get('order_number', idx + 1)
                        tc_serializer = QuizTestCaseSerializer(data=test_case)
                        if tc_serializer.is_valid(raise_exception=True):
                            tc_serializer.save()

            return QuizQuestionSerializer(updated_quiz_question).data
        raise ValidationError(serializer.errors)
    except QuizQuestion.DoesNotExist:
        raise ValidationError({"error": "Quiz question not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def delete_quiz_question(question_id):
    try:
        quiz_question = QuizQuestion.objects.get(id=question_id)

        with transaction.atomic():

            QuizTestCase.objects.filter(question=quiz_question).delete()

            quiz_question.delete()

        return {"message": "Quiz question deleted successfully."}
    except QuizQuestion.DoesNotExist:
        raise ValidationError({"error": "Quiz question not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_all_quiz_questions():
    try:
        return QuizQuestion.objects.filter(is_deleted=False).order_by('lesson_id', 'order_number', 'id')
    except Exception as e:
        raise ValidationError({"error": str(e)})



def get_lesson_quiz(lesson_id):
    try:

        try:
            lesson = Lesson.objects.get(id=lesson_id, is_deleted=False)
        except Lesson.DoesNotExist:
            raise ValidationError({"error": "Lesson not found."})

        if lesson.content_type == 'code' and lesson.content:
            return _get_code_lesson_quiz(lesson)

        questions = QuizQuestion.objects.filter(
            lesson=lesson,
            is_deleted=False
        ).order_by('order_number')

        if not questions.exists():
            raise ValidationError({"error": "No quiz questions found for this lesson."})

        total_points = sum(q.points for q in questions)

        quiz_data = {
            'lesson_id': lesson.id,
            'title': f"{lesson.title} Quiz",
            'description': lesson.description or "Test your knowledge",
            'time_limit': None,
            'passing_score': 70,
            'total_points': total_points,
            'total_questions': questions.count(),
            'questions': questions
        }

        serializer = LessonQuizSerializer(quiz_data)
        return serializer.data

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": str(e)})


def _get_code_lesson_quiz(lesson):
    import json
    try:
        code_data = json.loads(lesson.content)
    except (json.JSONDecodeError, TypeError, ValueError):
        raise ValidationError({"error": "Invalid code quiz data."})

    problem = code_data.get('problemStatement') or {}
    learning = code_data.get('learningObjectives') or {}
    starter_code = code_data.get('starterCode') or {}
    allowed_langs = code_data.get('allowedLanguages') or []
    hints_raw = code_data.get('hints') or []
    hints = [h.get('content', '') for h in hints_raw if isinstance(h, dict) and h.get('content')]

    test_cases = [
        {
            'id': i,
            'input_data': tc.get('input', ''),
            'expected_output': tc.get('expectedOutput', ''),
            'is_hidden': tc.get('isHidden', False),
            'points': tc.get('points'),
            'order_number': i,
        }
        for i, tc in enumerate(code_data.get('testCases') or [])
    ]

    points = code_data.get('points') or 100

    return {
        'quiz_id': None,
        'lesson_id': lesson.id,
        'title': code_data.get('title') or lesson.title,
        'description': problem.get('description') or lesson.description or '',
        'time_limit': code_data.get('timeLimit'),
        'passing_score': 70,
        'total_points': points,
        'total_questions': 1,
        'questions': [
            {
                'question_id': lesson.id,
                'question_text': code_data.get('title') or lesson.title,
                'question_type': 'code',
                'options': [],
                'correct_answer': None,
                'difficulty': learning.get('difficulty', 'medium'),
                'description': problem.get('description') or '',
                'order': 1,
                'points': points,
                'memory_limit': code_data.get('memoryLimit'),
                'allowed_languages': allowed_langs,
                'starter_code': json.dumps(starter_code) if starter_code else None,
                'function_name': code_data.get('functionName'),
                'require_completion': False,
                'time_limit': code_data.get('timeLimit'),
                'test_cases': test_cases,
                'image_url': None,
                'code_snippet': None,
                'hints': hints,
            }
        ],
    }



def create_test_case(data):
    """Create a new test case for a code question"""
    try:
        serializer = QuizTestCaseSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            test_case = serializer.save()
            return QuizTestCaseSerializer(test_case).data
        raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError({"error": str(e)})


def get_test_cases_by_question(question_id):
    """Get all test cases for a specific question"""
    try:
        test_cases = QuizTestCase.objects.filter(
            question_id=question_id,
            is_deleted=False
        ).order_by('order_number')

        if not test_cases.exists():
            return QuizTestCase.objects.none()

        return test_cases
    except Exception as e:
        raise ValidationError({"error": str(e)})


def update_test_case(test_case_id, data):
    """Update an existing test case"""
    try:
        test_case = QuizTestCase.objects.get(id=test_case_id, is_deleted=False)
        serializer = QuizTestCaseSerializer(test_case, data=data, partial=True)

        if serializer.is_valid(raise_exception=True):
            updated_test_case = serializer.save()
            return QuizTestCaseSerializer(updated_test_case).data
        raise ValidationError(serializer.errors)
    except QuizTestCase.DoesNotExist:
        raise ValidationError({"error": "Test case not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})


def delete_test_case(test_case_id):
    """Delete a test case"""
    try:
        test_case = QuizTestCase.objects.get(id=test_case_id)
        test_case.delete()
        return {"message": "Test case deleted successfully."}
    except QuizTestCase.DoesNotExist:
        raise ValidationError({"error": "Test case not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})
