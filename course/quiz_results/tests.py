from decimal import Decimal

from django.test import TestCase

from courses.models import Course
from coursemodules.models import CourseModule
from enrollments.models import Enrollment
from lessons.models import Lesson
from quiz_questions.models import QuizQuestion
from quiz_results.models import QuizResult
from quiz_results.services import calculate_quiz_evaluation
from utils.test_helpers import make_user


class QuizResultEvaluationTests(TestCase):
    def test_calculate_quiz_evaluation_ignores_deleted_questions(self):
        instructor = make_user("instructor", username="quiz_eval_instructor").instructor
        student = make_user("student", username="quiz_eval_student")
        course = Course.objects.create(title="Quiz Eval Course", instructor=instructor)
        module = CourseModule.objects.create(course=course, title="Quiz Module", order_number=1, status="Published")
        lesson = Lesson.objects.create(
            coursemodule=module,
            title="Quiz Lesson",
            content_type=Lesson.ContentType.QUIZ,
            order=1,
            status=Lesson.Status.PUBLISHED,
        )
        enrollment = Enrollment.objects.create(
            user=student,
            course=course,
            status=Enrollment.Status.Active,
            progress=Decimal("0.00"),
        )
        active_question = QuizQuestion.objects.create(
            lesson=lesson,
            question_text="Active?",
            question_type=QuizQuestion.QuestionType.SHORT_ANSWER,
            correct_answer="yes",
            points=10,
        )
        deleted_question = QuizQuestion.objects.create(
            lesson=lesson,
            question_text="Deleted?",
            question_type=QuizQuestion.QuestionType.SHORT_ANSWER,
            correct_answer="no",
            points=90,
            is_deleted=True,
        )
        result = QuizResult.objects.create(
            enrollment=enrollment,
            lesson=lesson,
            answers={
                str(active_question.id): "yes",
                str(deleted_question.id): "wrong",
            },
        )

        data = calculate_quiz_evaluation(result.id)

        self.assertEqual(data["total_questions"], 1)
        self.assertEqual(data["correct_answers"], 1)
        self.assertEqual(data["total_points"], 10)
        self.assertEqual(float(data["score"]), 100.0)
        self.assertTrue(data["passed"])
