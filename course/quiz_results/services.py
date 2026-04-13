from rest_framework.exceptions import ValidationError
from .models import QuizResult
from .serializers import (
    QuizResultSerializer,
    QuizResultDetailSerializer,
    UserQuizHistorySerializer
)
from quiz_questions.models import QuizQuestion
from quiz_questions.serializers import QuizSubmitSerializer
from lessons.models import Lesson
from enrollments.models import Enrollment
from users.models import User
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

def calculate_quiz_evaluation(quiz_result_id):
    try:
        quiz_result = QuizResult.objects.get(pk=quiz_result_id)
        lesson_id = quiz_result.lesson.id
        answers = quiz_result.answers or {}

        quiz_questions = QuizQuestion.objects.filter(lesson=lesson_id)
        total_questions = quiz_questions.count()
        correct_answers = 0
        total_points = 0
        student_points = 0

        for question in quiz_questions:
            total_points += question.points
            student_answer = answers.get(str(question.id))
            correct_answer = question.correct_answer

            if student_answer is not None and str(student_answer).lower() == str(correct_answer).lower():
                correct_answers += 1
                student_points += question.points

        score = 0
        if total_points > 0:
            score = (student_points / total_points) * 100

        passed = False

        lesson = Lesson.objects.get(pk=lesson_id)
        passing_score = getattr(lesson, 'passing_score', 70)
        if score >= passing_score:
            passed = True


        time_taken = quiz_result.time_taken
        if quiz_result.start_time and quiz_result.submit_time and time_taken is None:
            time_taken = int((quiz_result.submit_time - quiz_result.start_time).total_seconds())


        quiz_result.total_questions = total_questions
        quiz_result.correct_answers = correct_answers
        quiz_result.total_points = total_points
        quiz_result.score = score
        quiz_result.passed = passed
        quiz_result.time_taken = time_taken
        quiz_result.save()

        return {
            'time_taken': time_taken,
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'total_points': total_points,
            'score': score,
            'answers': answers,
            'passed': passed
        }

    except QuizResult.DoesNotExist:
        raise ValidationError({"error": "Quiz result not found."})
    except QuizQuestion.DoesNotExist:
        raise ValidationError({"error": "Quiz questions not found for this lesson."})
    except Lesson.DoesNotExist:
        raise ValidationError({"error": "Lesson not found."})
    except Exception as e:
        raise ValidationError(f"Error calculating quiz evaluation: {str(e)}")

def create_quiz_result(data):
    try:
        serializer = QuizResultSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            quiz_result = serializer.save()
            return serializer.data
        raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating quiz result: {str(e)}")

def get_quiz_result_by_id(quiz_result_id):
    try:
        quiz_result = QuizResult.objects.get(id=quiz_result_id)
        return QuizResultSerializer(quiz_result).data
    except QuizResult.DoesNotExist:
        raise ValidationError("Quiz result not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving quiz result: {str(e)}")

def get_quiz_results_by_enrollment(enrollment_id):
    try:
        quiz_results = QuizResult.objects.filter(enrollment=enrollment_id)
        return quiz_results
    except Exception as e:
        raise ValidationError(f"Error retrieving quiz results: {str(e)}")

def get_quiz_result_by_enrollment_and_lesson(enrollment_id, lesson_id):
    try:
        quiz_result = QuizResult.objects.filter(
            enrollment=enrollment_id,
            lesson=lesson_id,
            is_deleted=False
        ).first()
        if not quiz_result:
            return None
        return QuizResultSerializer(quiz_result).data
    except Exception as e:
        raise ValidationError(f"Error retrieving quiz result: {str(e)}")

def get_all_quiz_results():
    try:
        quiz_results = QuizResult.objects.all()
        return quiz_results
    except Exception as e:
        raise ValidationError(f"Error retrieving all quiz results: {str(e)}")

def update_quiz_result(quiz_result_id, data):
    try:
        quiz_result = QuizResult.objects.get(id=quiz_result_id)
        serializer = QuizResultSerializer(quiz_result, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            updated_quiz_result = serializer.save()
            return updated_quiz_result
        raise ValidationError(serializer.errors)
    except QuizResult.DoesNotExist:
        raise ValidationError("Quiz result not found")
    except Exception as e:
        raise ValidationError(f"Error updating quiz result: {str(e)}")

def delete_quiz_result(quiz_result_id):
    try:
        quiz_result = QuizResult.objects.get(id=quiz_result_id)
        quiz_result.delete()
        return {"message": "Quiz result deleted successfully"}
    except QuizResult.DoesNotExist:
        raise ValidationError("Quiz result not found")
    except Exception as e:
        raise ValidationError(f"Error deleting quiz result: {str(e)}")



def submit_quiz(data, user):
    """
    Submit quiz answers and calculate results
    """
    try:

        serializer = QuizSubmitSerializer(data=data)
        if not serializer.is_valid():
            raise ValidationError(serializer.errors)

        validated_data = serializer.validated_data
        lesson_id = validated_data['lesson_id']
        answers_data = validated_data['answers']
        time_spent = validated_data['time_spent']


        try:
            lesson = Lesson.objects.get(id=lesson_id, is_deleted=False)
        except Lesson.DoesNotExist:
            raise ValidationError({"error": "Lesson not found."})


        try:
            enrollment = Enrollment.objects.get(
                user=user,
                course=lesson.coursemodule.course,
                is_deleted=False
            )
        except Enrollment.DoesNotExist:
            raise ValidationError({"error": "User is not enrolled in this course."})


        questions = QuizQuestion.objects.filter(
            lesson=lesson,
            is_deleted=False
        )

        if not questions.exists():
            raise ValidationError({"error": "No quiz questions found for this lesson."})


        total_points = Decimal('0')
        earned_points = Decimal('0')
        answer_results = []


        answers_dict = {}

        for answer_data in answers_data:
            question_id = answer_data['question_id']

            try:
                question = questions.get(id=question_id)
            except QuizQuestion.DoesNotExist:
                continue

            total_points += Decimal(str(question.points))


            is_correct = False
            selected_option_id = answer_data.get('selected_option_id')
            text_answer = answer_data.get('text_answer', '')
            code_answer = answer_data.get('code_answer', '')
            actual_output = answer_data.get('actual_output', '')


            answers_dict[str(question_id)] = {
                'selected_option_id': selected_option_id,
                'text_answer': text_answer,
                'code_answer': code_answer,
                'actual_output': actual_output
            }


            if question.question_type == 'multiple' or question.question_type == 'multiple_choice':

                if selected_option_id is not None:
                    correct_answer = question.correct_answer

                    try:
                        if str(selected_option_id) == str(correct_answer):
                            is_correct = True
                    except:
                        pass

            elif question.question_type in ['short', 'short_answer', 'text_input']:

                if text_answer:
                    if text_answer.strip().lower() == question.correct_answer.strip().lower():
                        is_correct = True

            elif question.question_type in ['truefalse', 'true_false']:

                if selected_option_id is not None:
                    if str(selected_option_id) == str(question.correct_answer):
                        is_correct = True

            elif question.question_type == 'code':

                from quiz_questions.models import QuizTestCase

                test_cases = QuizTestCase.objects.filter(
                    question=question,
                    is_deleted=False
                ).order_by('order_number')

                test_cases_results = []
                passed_test_cases = 0
                total_test_cases = test_cases.count()

                if total_test_cases > 0 and actual_output:

                    actual_outputs = actual_output.strip().split('\n')

                    for idx, test_case in enumerate(test_cases):

                        actual_test_output = actual_outputs[idx].strip() if idx < len(actual_outputs) else ""
                        expected_test_output = test_case.expected_output.strip()


                        test_passed = (actual_test_output == expected_test_output)
                        if test_passed:
                            passed_test_cases += 1

                        test_cases_results.append({
                            'test_case_id': test_case.id,
                            'order_number': test_case.order_number,
                            'input': test_case.input_data,
                            'expected_output': test_case.expected_output if not test_case.is_hidden else None,
                            'actual_output': actual_test_output,
                            'passed': test_passed,
                            'points': float(test_case.points) if test_passed else 0
                        })


                    if total_test_cases > 0:
                        points_ratio = Decimal(str(passed_test_cases)) / Decimal(str(total_test_cases))
                        points_earned = Decimal(str(question.points)) * points_ratio
                        is_correct = (passed_test_cases == total_test_cases)
                    else:
                        points_earned = Decimal('0')
                else:
                    points_earned = Decimal('0')
                    test_cases_results = []


            if question.question_type != 'code':
                points_earned = Decimal(str(question.points)) if is_correct else Decimal('0')

            earned_points += points_earned


            answer_result = {
                'question_id': question_id,
                'selected_option_id': selected_option_id,
                'text_answer': text_answer,
                'code_answer': code_answer,
                'actual_output': actual_output,
                'is_correct': is_correct,
                'points_earned': float(points_earned),
                'correct_answer_explanation': question.explanation or ""
            }


            if question.question_type == 'code' and 'test_cases_results' in locals():
                answer_result['test_cases_results'] = test_cases_results

            answer_results.append(answer_result)


        score = (earned_points / total_points * 100) if total_points > 0 else Decimal('0')
        passing_score = 70
        passed = score >= passing_score


        existing_result = QuizResult.objects.filter(
            enrollment=enrollment,
            lesson=lesson,
        ).first()
        attempt = (existing_result.attempt + 1) if existing_result else 1


        quiz_result, created = QuizResult.objects.update_or_create(
            enrollment=enrollment,
            lesson=lesson,
            defaults={
                'start_time': timezone.now() - timedelta(seconds=time_spent),
                'submit_time': timezone.now(),
                'time_taken': time_spent,
                'total_questions': questions.count(),
                'correct_answers': sum(1 for ar in answer_results if ar['is_correct']),
                'total_points': int(total_points),
                'score': score,
                'answers': answers_dict,
                'passed': passed,
                'attempt': attempt,
                'is_deleted': False,
            }
        )


        result_data = {
            'quiz_result_id': quiz_result.id,
            'quiz_id': lesson.id,
            'user_id': user.id,
            'score': float(score),
            'total_points': float(total_points),
            'earned_points': float(earned_points),
            'passing_score': passing_score,
            'passed': passed,
            'time_spent': time_spent,
            'submitted_at': quiz_result.submit_time,
            'answers': answer_results
        }

        result_serializer = QuizResultDetailSerializer(result_data)
        return result_serializer.data

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error submitting quiz: {str(e)}"})


def get_user_quiz_history(user_id):
    """
    Get all quiz results for a user
    """
    try:

        try:
            user = User.objects.get(id=user_id, is_deleted=False)
        except User.DoesNotExist:
            raise ValidationError({"error": "User not found."})


        enrollments = Enrollment.objects.filter(
            user=user,
            is_deleted=False
        )

        if not enrollments.exists():
            return []


        quiz_results = QuizResult.objects.filter(
            enrollment__in=enrollments,
            is_deleted=False
        ).select_related('lesson', 'lesson__coursemodule', 'lesson__coursemodule__course').order_by('-submit_time')

        if not quiz_results.exists():
            return []


        history_data = []
        for result in quiz_results:
            history_data.append({
                'quiz_result_id': result.id,
                'lesson_id': result.lesson.id,
                'lesson_title': result.lesson.title,
                'course_title': result.lesson.coursemodule.course.title,
                'score': result.score,
                'passed': result.passed,
                'attempt': result.attempt,
                'submitted_at': result.submit_time,
                'time_spent': result.time_taken or 0
            })

        return history_data

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error retrieving quiz history: {str(e)}"})


def get_quiz_result_detail(quiz_result_id):
    """
    Get detailed information about a specific quiz result
    """
    try:

        try:
            quiz_result = QuizResult.objects.select_related(
                'lesson', 'enrollment', 'enrollment__user'
            ).get(id=quiz_result_id, is_deleted=False)
        except QuizResult.DoesNotExist:
            raise ValidationError({"error": "Quiz result not found."})


        questions = QuizQuestion.objects.filter(
            lesson=quiz_result.lesson,
            is_deleted=False
        )

        answer_results = []
        answers_dict = quiz_result.answers or {}

        for question in questions:
            question_answer = answers_dict.get(str(question.id), {})


            is_correct = False
            selected_option_id = question_answer.get('selected_option_id')
            text_answer = question_answer.get('text_answer', '')


            if question.question_type == 'multiple' or question.question_type == 'multiple_choice':
                if selected_option_id is not None:
                    if str(selected_option_id) == str(question.correct_answer):
                        is_correct = True
            elif question.question_type in ['short', 'short_answer', 'text_input']:
                if text_answer:
                    if text_answer.strip().lower() == question.correct_answer.strip().lower():
                        is_correct = True
            elif question.question_type in ['truefalse', 'true_false']:
                if selected_option_id is not None:
                    if str(selected_option_id) == str(question.correct_answer):
                        is_correct = True

            points_earned = float(question.points) if is_correct else 0.0

            answer_results.append({
                'question_id': question.id,
                'selected_option_id': selected_option_id,
                'text_answer': text_answer,
                'is_correct': is_correct,
                'points_earned': points_earned,
                'correct_answer_explanation': question.explanation or ""
            })


        result_data = {
            'quiz_result_id': quiz_result.id,
            'quiz_id': quiz_result.lesson.id,
            'user_id': quiz_result.enrollment.user.id,
            'score': float(quiz_result.score),
            'total_points': float(quiz_result.total_points),
            'earned_points': float(quiz_result.score * quiz_result.total_points / 100) if quiz_result.total_points > 0 else 0.0,
            'passing_score': 70,
            'passed': quiz_result.passed,
            'time_spent': quiz_result.time_taken or 0,
            'submitted_at': quiz_result.submit_time,
            'answers': answer_results
        }

        result_serializer = QuizResultDetailSerializer(result_data)
        return result_serializer.data

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error retrieving quiz result detail: {str(e)}"})
