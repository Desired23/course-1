from rest_framework.exceptions import ValidationError
from .models import QuizResult
from .serializers import QuizResultSerializer
from quiz_questions.models import QuizQuestion
from lessons.models import Lesson

def calculate_quiz_evaluation(quiz_result_id):
    try:
        quiz_result = QuizResult.objects.get(pk=quiz_result_id)
        lesson_id = quiz_result.lesson.id  # Fix: use lesson.id instead of lesson_id_id
        answers = quiz_result.answers or {}

        quiz_questions = QuizQuestion.objects.filter(lesson_id=lesson_id)
        total_questions = quiz_questions.count()
        correct_answers = 0
        total_points = 0
        student_points = 0

        for question in quiz_questions:
            total_points += question.points
            student_answer = answers.get(str(question.question_id))  # Đảm bảo question_id là string
            correct_answer = question.correct_answer

            if student_answer is not None and str(student_answer).lower() == str(correct_answer).lower():
                correct_answers += 1
                student_points += question.points

        score = 0
        if total_points > 0:
            score = (student_points / total_points) * 100

        passed = False
        # Lấy điểm đạt từ Lesson, mặc định 70 nếu không có
        lesson = Lesson.objects.get(pk=lesson_id)
        passing_score = getattr(lesson, 'passing_score', 70)
        if score >= passing_score:
            passed = True

        # Tính thời gian làm bài nếu chưa có
        time_taken = quiz_result.time_taken
        if quiz_result.start_time and quiz_result.submit_time and time_taken is None:
            time_taken = int((quiz_result.submit_time - quiz_result.start_time).total_seconds())

        # Cập nhật các trường trong QuizResult
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
        quiz_results = QuizResult.objects.filter(Enrollment_id=enrollment_id)
        if not quiz_results.exists():
            raise ValidationError("No quiz results found for this enrollment.")
        return QuizResultSerializer(quiz_results, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving quiz results: {str(e)}")

def get_all_quiz_results():
    try:
        quiz_results = QuizResult.objects.all()
        if not quiz_results.exists():
            raise ValidationError("No quiz results found.")
        return QuizResultSerializer(quiz_results, many=True).data
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
