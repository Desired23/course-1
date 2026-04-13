from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db.models import Q

from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import (
    UserPaymentMethodSerializer,
    UserPaymentMethodCreateSerializer,
    InstructorPayoutMethodSerializer,
    InstructorPayoutMethodCreateSerializer,
)
from .services import (
    get_user_payment_methods,
    create_user_payment_method,
    update_user_payment_method,
    delete_user_payment_method,
    set_default_user_payment_method,
    get_instructor_payout_methods,
    create_instructor_payout_method,
    update_instructor_payout_method,
    delete_instructor_payout_method,
    set_default_instructor_payout_method,
)


class UserPaymentMethodListCreateView(APIView):
    """
    GET  /api/payment-methods/user/        - list my payment methods
    POST /api/payment-methods/user/        - add new payment method
    """
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        methods = get_user_payment_methods(request.user.id)

        method_type = request.query_params.get('method_type')
        default_filter = request.query_params.get('default_filter')
        search = (request.query_params.get('search') or '').strip()

        if method_type:
            methods = methods.filter(method_type=method_type)
        if default_filter == 'default':
            methods = methods.filter(is_default=True)
        elif default_filter == 'non_default':
            methods = methods.filter(is_default=False)
        if search:
            methods = methods.filter(
                Q(nickname__icontains=search)
                | Q(masked_account__icontains=search)
                | Q(bank_name__icontains=search)
                | Q(account_name__icontains=search)
            )

        return paginate_queryset(methods, request, UserPaymentMethodSerializer)

    def post(self, request):
        ser = UserPaymentMethodCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            method = create_user_payment_method(request.user, ser.validated_data)
            return Response(UserPaymentMethodSerializer(method).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserPaymentMethodDetailView(APIView):
    """
    PATCH  /api/payment-methods/user/<id>/         - update
    DELETE /api/payment-methods/user/<id>/         - soft delete
    POST   /api/payment-methods/user/<id>/default/ - set as default
    """
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'burst'

    def patch(self, request, method_id):
        try:
            method = update_user_payment_method(method_id, request.user, request.data)
            return Response(UserPaymentMethodSerializer(method).data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, method_id):
        try:
            delete_user_payment_method(method_id, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserPaymentMethodSetDefaultView(APIView):
    """POST /api/payment-methods/user/<id>/default/"""
    permission_classes = [RolePermissionFactory(['student', 'instructor', 'admin'])]
    throttle_scope = 'burst'

    def post(self, request, method_id):
        try:
            method = set_default_user_payment_method(method_id, request.user)
            return Response(UserPaymentMethodSerializer(method).data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)




class InstructorPayoutMethodListCreateView(APIView):
    """
    GET  /api/payment-methods/instructor/         - list my payout methods
    POST /api/payment-methods/instructor/         - add new payout method
    """
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def get(self, request):
        instructor = getattr(request.user, 'instructor', None)
        if not instructor:
            return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)
        methods = get_instructor_payout_methods(instructor.id)
        return Response(InstructorPayoutMethodSerializer(methods, many=True).data)

    def post(self, request):
        instructor = getattr(request.user, 'instructor', None)
        if not instructor:
            return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)
        ser = InstructorPayoutMethodCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            method = create_instructor_payout_method(instructor, ser.validated_data)
            return Response(InstructorPayoutMethodSerializer(method).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorPayoutMethodDetailView(APIView):
    """
    PATCH  /api/payment-methods/instructor/<id>/
    DELETE /api/payment-methods/instructor/<id>/
    """
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def patch(self, request, method_id):
        instructor = getattr(request.user, 'instructor', None)
        if not instructor:
            return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)
        try:
            method = update_instructor_payout_method(method_id, instructor, request.data)
            return Response(InstructorPayoutMethodSerializer(method).data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, method_id):
        instructor = getattr(request.user, 'instructor', None)
        if not instructor:
            return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)
        try:
            delete_instructor_payout_method(method_id, instructor)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class InstructorPayoutMethodSetDefaultView(APIView):
    """POST /api/payment-methods/instructor/<id>/default/"""
    permission_classes = [RolePermissionFactory(['instructor', 'admin'])]
    throttle_scope = 'burst'

    def post(self, request, method_id):
        instructor = getattr(request.user, 'instructor', None)
        if not instructor:
            return Response({"error": "Instructor profile not found."}, status=status.HTTP_403_FORBIDDEN)
        try:
            method = set_default_instructor_payout_method(method_id, instructor)
            return Response(InstructorPayoutMethodSerializer(method).data)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_400_BAD_REQUEST)
