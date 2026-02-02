from rest_framework.exceptions import ValidationError
from .models import QuizQuestion
from .serializers import QuizQuestionSerializer

def create_quiz_question(data):
    try:
        # print("Data received for quiz question creation:", data)
        serializer = QuizQuestionSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            print("Serializer data:", serializer.validated_data)
            quiz_question = serializer.save()
            return QuizQuestionSerializer(quiz_question).data
        raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_quiz_questions_by_lesson(lesson_id):
    try:
        quiz_questions = QuizQuestion.objects.filter(lesson_id=lesson_id)
        if not quiz_questions.exists():
            raise ValidationError({"error": "No quiz questions found."})
        serializer = QuizQuestionSerializer(quiz_questions, many=True)
        return serializer.data
    except Exception as e:
        raise ValidationError({"error": str(e)})

def find_quiz_question_by_id(question_id):
    try:
        quiz_question = QuizQuestion.objects.get(id=question_id)
        serializer = QuizQuestionSerializer(quiz_question)
        return serializer.data
    except QuizQuestion.DoesNotExist:
        raise ValidationError({"error": "Quiz question not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def update_quiz_question(question_id, data):
    try:
        quiz_question = QuizQuestion.objects.get(id=question_id)
        serializer = QuizQuestionSerializer(quiz_question, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            updated_quiz_question = serializer.save()
            return QuizQuestionSerializer(updated_quiz_question).data
        raise ValidationError(serializer.errors)
    except QuizQuestion.DoesNotExist:
        raise ValidationError({"error": "Quiz question not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def delete_quiz_question(question_id):
    try:
        quiz_question = QuizQuestion.objects.get(id=question_id)
        quiz_question.delete()
        return {"message": "Quiz question deleted successfully."}
    except QuizQuestion.DoesNotExist:
        raise ValidationError({"error": "Quiz question not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})

def get_all_quiz_questions():
    try:
        quiz_questions = QuizQuestion.objects.all()
        if not quiz_questions.exists():
            raise ValidationError({"error": "No quiz questions found."})
        serializer = QuizQuestionSerializer(quiz_questions, many=True)
        return serializer.data
    except Exception as e:
        raise ValidationError({"error": str(e)})