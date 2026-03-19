from rest_framework.exceptions import ValidationError
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .models import Review
from courses.models import Course
from .serializers import ReviewSerializer
from .services import (
    create_review,
    update_review,
    delete_review,
    get_reviews_by_course,
    get_reviews_by_user,
    get_reviews_by_instructor,
    get_review_by_id,
    count_reviews_by_course,
    count_like_review
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset

class ReviewListView(APIView):
    throttle_scope = 'review'
    def get(self, request):
        # GET is public - no auth required
        try:
            user_id = request.query_params.get('user_id')
            instructor_id = request.query_params.get('instructor_id')
            if user_id:
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
                    Q(comment__icontains=search)
                    | Q(course__title__icontains=search)
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
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)
    def post(self, request):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        try:
            data = request.data.copy()
            data['user_id'] = request.user.id  # enforce from token, prevent IDOR
            review = create_review(data)
            return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def patch(self, request, review_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        try:
            updated_review = update_review(review_id, request.data, requesting_user=request.user)
            return Response(ReviewSerializer(updated_review).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, review_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        try:
            result = delete_review(review_id, requesting_user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)

class ReviewDetailView(APIView):
    throttle_scope = 'burst'
    def get(self, request, review_id):
        try:
            review = get_review_by_id(review_id)
            return Response(review, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)
