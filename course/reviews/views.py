from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .serializers import ReviewSerializer
from .services import (
    create_review,
    delete_review,
    get_reported_reviews,
    get_review_by_id,
    get_reviews_by_course,
    get_reviews_by_instructor,
    get_reviews_by_user,
    moderate_review,
    report_review,
    update_review,
)
from utils.pagination import paginate_queryset
from utils.permissions import RolePermissionFactory


class ReviewListView(APIView):
    throttle_scope = 'review'

    def get(self, request):
        try:
            user_id = request.query_params.get('user_id')
            instructor_id = request.query_params.get('instructor_id')
            reported_only = request.query_params.get('reported') == 'true'

            if reported_only:
                reviews = get_reported_reviews()
            elif user_id:
                reviews = get_reviews_by_user(user_id)
            elif instructor_id:
                reviews = get_reviews_by_instructor(instructor_id)
            else:
                reviews = get_reviews_by_course(request.query_params.get('course_id'))

            search = (request.query_params.get('search') or '').strip()
            rating = request.query_params.get('rating')
            sort_by = request.query_params.get('sort_by')

            if search:
                reviews = reviews.filter(
                    Q(comment__icontains=search) | Q(course__title__icontains=search)
                )
            if rating:
                reviews = reviews.filter(rating=rating)

            if sort_by == 'oldest':
                reviews = reviews.order_by('created_at')
            elif sort_by == 'rating_desc':
                reviews = reviews.order_by('-rating', '-created_at')
            elif sort_by == 'rating_asc':
                reviews = reviews.order_by('rating', '-created_at')
            else:
                reviews = reviews.order_by('-created_at')

            return paginate_queryset(reviews, request, ReviewSerializer)
        except ValidationError as exc:
            return Response({"error": exc.detail}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        try:
            data = request.data.copy()
            data['user_id'] = request.user.id
            review = create_review(data)
            return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
        except ValidationError as exc:
            return Response({"errors": exc.detail}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, review_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        try:
            updated_review = update_review(review_id, request.data, requesting_user=request.user)
            return Response(ReviewSerializer(updated_review).data, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({"errors": exc.detail}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, review_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        try:
            result = delete_review(review_id, requesting_user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({"errors": exc.detail}, status=status.HTTP_404_NOT_FOUND)


class ReviewDetailView(APIView):
    throttle_scope = 'burst'

    def get(self, request, review_id):
        try:
            review = get_review_by_id(review_id)
            return Response(review, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({"error": exc.detail}, status=status.HTTP_404_NOT_FOUND)


class ReviewReportView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, review_id):
        try:
            review = report_review(review_id, request.data.get('reason', ''))
            return Response(ReviewSerializer(review).data, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({"errors": exc.detail}, status=status.HTTP_400_BAD_REQUEST)


class ReviewModerationView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, review_id):
        try:
            review = moderate_review(
                review_id,
                request.data.get('action'),
                request.data.get('reason', ''),
            )
            return Response(ReviewSerializer(review).data, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({"errors": exc.detail}, status=status.HTTP_400_BAD_REQUEST)
