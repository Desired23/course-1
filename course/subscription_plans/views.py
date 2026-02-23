from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from utils.permissions import RolePermissionFactory
from .services import (
    create_subscription_plan,
    get_subscription_plan,
    get_all_subscription_plans,
    update_subscription_plan,
    delete_subscription_plan,
    add_course_to_plan,
    remove_course_from_plan,
    get_plan_courses,
    subscribe_to_plan,
    get_user_subscriptions,
    get_user_subscription_detail,
    cancel_subscription,
    user_has_plan_access,
    get_user_accessible_courses,
    get_plan_subscribers,
    expire_overdue_subscriptions,
)
from .serializers import SubscriptionPlanListSerializer, PlanCourseSerializer, UserSubscriptionListSerializer
from utils.pagination import paginate_queryset


class SubscriptionPlanPublicView(APIView):

    def get(self, request):
        try:
            plan_id = request.query_params.get('plan_id')
            if plan_id:
                result = get_subscription_plan(int(plan_id))
                return Response(result, status=status.HTTP_200_OK)
            results = get_all_subscription_plans(include_inactive=False)
            return paginate_queryset(results, request, SubscriptionPlanListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class PlanCoursesPublicView(APIView):

    def get(self, request, plan_id):
        try:
            results = get_plan_courses(plan_id)
            return paginate_queryset(results, request, PlanCourseSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class SubscriptionPlanAdminView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def get(self, request):
        try:
            plan_id = request.query_params.get('plan_id')
            if plan_id:
                result = get_subscription_plan(int(plan_id))
                return Response(result, status=status.HTTP_200_OK)
            results = get_all_subscription_plans(include_inactive=True)
            return paginate_queryset(results, request, SubscriptionPlanListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, plan_id=None):
        try:
            result = create_subscription_plan(request.data, admin_user=request.user)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, plan_id):
        try:
            result = update_subscription_plan(plan_id, request.data)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, plan_id):
        try:
            result = delete_subscription_plan(plan_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class PlanCourseAdminView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def post(self, request, plan_id):
        try:
            course_id = request.data.get('course_id')
            if not course_id:
                return Response(
                    {"error": "course_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = add_course_to_plan(plan_id, course_id, admin_user=request.user)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, plan_id):
        try:
            course_id = request.data.get('course_id')
            if not course_id:
                return Response(
                    {"error": "course_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = remove_course_from_plan(plan_id, course_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class PlanSubscribersView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def get(self, request, plan_id):
        try:
            results = get_plan_subscribers(plan_id)
            return paginate_queryset(results, request, UserSubscriptionListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class ExpireSubscriptionsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def post(self, request):
        result = expire_overdue_subscriptions()
        return Response(result, status=status.HTTP_200_OK)


class UserSubscribeView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def post(self, request):
        try:
            plan_id = request.data.get('plan_id')
            payment_id = request.data.get('payment_id')
            if not plan_id:
                return Response(
                    {"error": "plan_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = subscribe_to_plan(request.user, plan_id, payment_id)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserSubscriptionView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def get(self, request):
        try:
            subscription_id = request.query_params.get('subscription_id')
            if subscription_id:
                result = get_user_subscription_detail(int(subscription_id), request.user)
                return Response(result, status=status.HTTP_200_OK)
            results = get_user_subscriptions(request.user)
            return paginate_queryset(results, request, UserSubscriptionListSerializer)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)


class UserCancelSubscriptionView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def post(self, request, subscription_id):
        try:
            result = cancel_subscription(subscription_id, request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class UserCourseAccessView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def get(self, request):
        try:
            course_id = request.query_params.get('course_id')
            if course_id:
                has_access = user_has_plan_access(request.user.id, int(course_id))
                return Response({"has_access": has_access}, status=status.HTTP_200_OK)
            course_ids = get_user_accessible_courses(request.user)
            return Response({"accessible_course_ids": course_ids}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
