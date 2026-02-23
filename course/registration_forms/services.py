from rest_framework.exceptions import ValidationError
from .models import RegistrationForm, FormQuestion
from .serializers import (
    RegistrationFormSerializer,
    FormQuestionSerializer,
)


def create_registration_form(data, user=None):
    try:
        form_data = {
            'type': data.get('type'),
            'title': data.get('title'),
            'description': data.get('description', ''),
            'is_active': data.get('is_active', True),
            'version': data.get('version', 1),
        }
        if user:
            form_data['created_by'] = user.id

        serializer = RegistrationFormSerializer(data=form_data)
        if serializer.is_valid(raise_exception=True):
            form = serializer.save()

            questions_data = data.get('questions', [])
            for q_data in questions_data:
                FormQuestion.objects.create(form=form, **q_data)

            return RegistrationFormSerializer(form).data

    except Exception as e:
        raise ValidationError({"error": str(e)})


def get_registration_form(form_id):
    try:
        form = RegistrationForm.objects.prefetch_related('questions').get(
            id=form_id, is_deleted=False
        )
        return RegistrationFormSerializer(form).data
    except RegistrationForm.DoesNotExist:
        raise ValidationError({"error": "Form not found."})


def get_all_registration_forms():
    forms = RegistrationForm.objects.filter(is_deleted=False)
    return forms


def get_active_form_by_type(form_type):
    try:
        form = RegistrationForm.objects.prefetch_related(
            'questions'
        ).filter(
            type=form_type, is_active=True, is_deleted=False
        ).order_by('-version').first()

        if not form:
            raise ValidationError({"error": f"No active form found for type '{form_type}'."})

        return RegistrationFormSerializer(form).data
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": str(e)})


def update_registration_form(form_id, data):
    try:
        form = RegistrationForm.objects.get(id=form_id, is_deleted=False)
        serializer = RegistrationFormSerializer(form, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return RegistrationFormSerializer(form).data
    except RegistrationForm.DoesNotExist:
        raise ValidationError({"error": "Form not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})


def delete_registration_form(form_id):
    try:
        form = RegistrationForm.objects.get(id=form_id, is_deleted=False)
        form.is_deleted = True
        form.save()
        return {"message": "Form deleted successfully."}
    except RegistrationForm.DoesNotExist:
        raise ValidationError({"error": "Form not found."})


def add_question_to_form(form_id, data):
    try:
        form = RegistrationForm.objects.get(id=form_id, is_deleted=False)
        data['form'] = form.id
        serializer = FormQuestionSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return serializer.data
    except RegistrationForm.DoesNotExist:
        raise ValidationError({"error": "Form not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})


def update_question(question_id, data):
    try:
        question = FormQuestion.objects.get(id=question_id, is_deleted=False)
        serializer = FormQuestionSerializer(question, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return serializer.data
    except FormQuestion.DoesNotExist:
        raise ValidationError({"error": "Question not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})


def delete_question(question_id):
    try:
        question = FormQuestion.objects.get(id=question_id, is_deleted=False)
        question.is_deleted = True
        question.save()
        return {"message": "Question deleted successfully."}
    except FormQuestion.DoesNotExist:
        raise ValidationError({"error": "Question not found."})


def batch_update_questions(form_id, questions_data):
    try:
        form = RegistrationForm.objects.get(id=form_id, is_deleted=False)
        FormQuestion.objects.filter(form=form, is_deleted=False).update(is_deleted=True)
        for q_data in questions_data:
            FormQuestion.objects.create(form=form, **q_data)
        form.version += 1
        form.save()
        return RegistrationFormSerializer(form).data
    except RegistrationForm.DoesNotExist:
        raise ValidationError({"error": "Form not found."})
    except Exception as e:
        raise ValidationError({"error": str(e)})
