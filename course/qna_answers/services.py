from rest_framework.exceptions import ValidationError
from .models import QnAAnswer
from .serializers import QnAAnswerSerializer

def create_qna_answer(data):
    try:
        serializer = QnAAnswerSerializer(data=data)
        if serializer.is_valid():
            qna_answer = serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating QnA Answer: {str(e)}")

def get_qna_answer_by_id(answer_id):
    try:
        qna_answer = QnAAnswer.objects.get(id=answer_id)
        return QnAAnswerSerializer(qna_answer).data
    except QnAAnswer.DoesNotExist:
        raise ValidationError("QnA Answer not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving QnA Answer: {str(e)}")

def get_qna_answers_by_qna_id(qna_id):
    try:
        qna_answer_list = QnAAnswer.objects.filter(qna_id=qna_id)
        if not qna_answer_list.exists():
            raise ValidationError("No QnA Answers found for this QnA ID.")
        return QnAAnswerSerializer(qna_answer_list, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving QnA Answers: {str(e)}")

def update_qna_answer(answer_id, data):
    try:
        qna_answer = QnAAnswer.objects.get(id=answer_id)
        serializer = QnAAnswerSerializer(qna_answer, data=data, partial=True)
        if serializer.is_valid():
            updated_qna_answer = serializer.save()
            return QnAAnswerSerializer(updated_qna_answer).data
        else:
            raise ValidationError(serializer.errors)
    except QnAAnswer.DoesNotExist:
        raise ValidationError("QnA Answer not found")
    except Exception as e:
        raise ValidationError(f"Error updating QnA Answer: {str(e)}")

def delete_qna_answer(answer_id):
    try:
        qna_answer = QnAAnswer.objects.get(id=answer_id)
        qna_answer.delete()
        return {"message": "QnA Answer deleted successfully"}
    except QnAAnswer.DoesNotExist:
        raise ValidationError("QnA Answer not found")
    except Exception as e:
        raise ValidationError(f"Error deleting QnA Answer: {str(e)}")