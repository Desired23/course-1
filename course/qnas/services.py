from rest_framework.exceptions import ValidationError
from .models import QnA
from .serializers import QnASerializer

def create_qna(data):
    try:
        serializer = QnASerializer(data=data)
        if serializer.is_valid():
            qna = serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating QnA: {str(e)}")

def get_qna_by_id(qna_id):
    try:
        qna = QnA.objects.get(id=qna_id)
        return QnASerializer(qna).data
    except QnA.DoesNotExist:
        raise ValidationError("QnA not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving QnA: {str(e)}")

def get_qna_by_user_id(user_id):
    try:
        qna_list = QnA.objects.filter(user_id=user_id)
        if not qna_list.exists():
            raise ValidationError("No QnA found for this user_id.")
        return QnASerializer(qna_list, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving QnA: {str(e)}")

def get_all_qna():
    try:
        qna_list = QnA.objects.all()
        if not qna_list.exists():
            raise ValidationError("No QnA found.")
        return QnASerializer(qna_list, many=True).data
    except Exception as e:
        raise ValidationError(f"Error retrieving all QnA: {str(e)}")

def update_qna(qna_id, data):
    try:
        qna = QnA.objects.get(id=qna_id)
        serializer = QnASerializer(qna, data=data, partial=True)
        if serializer.is_valid():
            updated_qna = serializer.save()
            return QnASerializer(updated_qna).data
        else:
            raise ValidationError(serializer.errors)
    except QnA.DoesNotExist:
        raise ValidationError("QnA not found")
    except Exception as e:
        raise ValidationError(f"Error updating QnA: {str(e)}")

def delete_qna(qna_id):
    try:
        qna = QnA.objects.get(id=qna_id)
        qna.delete()
        return {"message": "QnA deleted successfully"}
    except QnA.DoesNotExist:
        raise ValidationError("QnA not found")
    except Exception as e:
        raise ValidationError(f"Error deleting QnA: {str(e)}")