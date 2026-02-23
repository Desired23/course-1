from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.permissions import RolePermissionFactory
from .services import (
    create_registration_form,
    get_registration_form,
    get_all_registration_forms,
    get_active_form_by_type,
    update_registration_form,
    delete_registration_form,
    add_question_to_form,
    update_question,
    delete_question,
    batch_update_questions,
)
from .serializers import RegistrationFormListSerializer
from utils.pagination import paginate_queryset


class RegistrationFormAdminView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def get(self, request, form_id=None):
        try:
            form_id = form_id or request.query_params.get('form_id')
            if form_id:
                form = get_registration_form(form_id)
                return Response(form, status=status.HTTP_200_OK)
            forms = get_all_registration_forms()
            return paginate_queryset(forms, request, RegistrationFormListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, form_id=None):
        try:
            form = create_registration_form(request.data, user=request.user)
            return Response(form, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, form_id):
        try:
            form = update_registration_form(form_id, request.data)
            return Response(form, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, form_id):
        try:
            result = delete_registration_form(form_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class RegistrationFormPublicView(APIView):

    def get(self, request):
        try:
            form_type = request.query_params.get('type')
            if not form_type:
                return Response(
                    {"error": "Query parameter 'type' is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            form = get_active_form_by_type(form_type)
            return Response(form, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class FormQuestionAdminView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def post(self, request, form_id=None, question_id=None):
        try:
            question = add_question_to_form(form_id, request.data)
            return Response(question, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, form_id=None, question_id=None):
        try:
            question = update_question(question_id, request.data)
            return Response(question, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, form_id=None, question_id=None):
        try:
            result = delete_question(question_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class FormQuestionBatchView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def put(self, request, form_id):
        try:
            questions_data = request.data.get('questions', [])
            form = batch_update_questions(form_id, questions_data)
            return Response(form, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
