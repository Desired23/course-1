from django.db.models import Case, IntegerField, Q, When
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .serializers import ReviewSerializer
from .models import Review
from .services import (
    create_review,
    delete_review,
    get_reported_reviews,
    get_course_review_stats,
    get_review_by_id,
    get_reviews_by_course,
    get_reviews_by_instructor,
    get_reviews_by_user,
    moderate_review,
    update_review,
)
from utils.pagination import paginate_queryset
from utils.permissions import RolePermissionFactory


def _parse_int_list(raw_value):
    ids = []
    for value in (raw_value or '').split(','):
        value = value.strip()
        if not value:
            continue
        try:
            ids.append(int(value))
        except ValueError:
            continue
    return ids


class ReviewListView(APIView):
    throttle_scope = 'review'

    def get(self, request):
        user_id = request.query_params.get('user_id')
        course_id = request.query_params.get('course_id')
        instructor_id = request.query_params.get('instructor_id')
        reported_only = request.query_params.get('reported') == 'true'
        mine_only = request.query_params.get('mine') == 'true'
        include_hidden = request.query_params.get('include_hidden') == 'true'

        if include_hidden:
            self.permission_classes = [RolePermissionFactory(['admin'])]
            self.check_permissions(request)

        if mine_only:
            self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
            self.check_permissions(request)
            reviews = get_reviews_by_user(request.user.id)
        elif reported_only:
            reviews = get_reported_reviews()
        elif user_id:
            reviews = get_reviews_by_user(user_id)
        elif instructor_id:
            reviews = get_reviews_by_instructor(instructor_id)
        else:
            reviews = get_reviews_by_course(course_id, include_hidden=include_hidden)

        if course_id and (mine_only or reported_only or user_id or instructor_id):
            reviews = reviews.filter(course=course_id)

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
        elif sort_by == 'likes':
            reviews = reviews.order_by('-likes', '-created_at')
        else:
            reviews = reviews.order_by('-created_at')

        return paginate_queryset(reviews, request, ReviewSerializer)

    def post(self, request):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        data = request.data.copy()
        data['user_id'] = request.user.id
        review = create_review(data)
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    def patch(self, request, review_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        updated_review = update_review(review_id, request.data, requesting_user=request.user)
        return Response(ReviewSerializer(updated_review).data, status=status.HTTP_200_OK)

    def delete(self, request, review_id):
        self.permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
        self.check_permissions(request)
        result = delete_review(review_id, requesting_user=request.user)
        return Response(result, status=status.HTTP_200_OK)


class ReviewDetailView(APIView):
    throttle_scope = 'burst'

    def get(self, request, review_id):
        return Response(get_review_by_id(review_id), status=status.HTTP_200_OK)


class HomepageReviewListView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'burst'

    def get(self, request):
        review_ids = _parse_int_list(
            request.query_params.get('ids') or request.query_params.get('review_ids')
        )
        try:
            limit = int(request.query_params.get('limit', 6))
        except (TypeError, ValueError):
            limit = 6
        limit = max(1, min(limit, 12))

        reviews = (
            Review.objects
            .filter(
                is_deleted=False,
                status=Review.StatusChoices.APPROVED,
                comment__isnull=False,
            )
            .exclude(comment='')
            .select_related('user', 'course')
        )

        if review_ids:
            preserved_order = Case(
                *[When(id=review_id, then=position) for position, review_id in enumerate(review_ids)],
                output_field=IntegerField(),
            )
            reviews = reviews.filter(id__in=review_ids).order_by(preserved_order)
        else:
            reviews = reviews.order_by('-likes', '-created_at')

        return Response(ReviewSerializer(reviews[:limit], many=True).data, status=status.HTTP_200_OK)


class CourseReviewStatsView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'burst'

    def get(self, request):
        course_id = request.query_params.get('course_id')
        return Response(get_course_review_stats(course_id), status=status.HTTP_200_OK)


class ReviewReportView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'

    def post(self, request, review_id):
        from reports.services import create_report
        try:
            create_report(
                reporter=request.user,
                target_type='review',
                target_id=review_id,
                reason=request.data.get('reason', 'other'),
                description=request.data.get('description', ''),
            )
        except Exception as exc:
            detail = getattr(exc, 'detail', str(exc))
            return Response({'errors': detail}, status=status.HTTP_400_BAD_REQUEST)
        try:
            review = Review.objects.get(id=review_id, is_deleted=False)
        except Review.DoesNotExist:
            return Response({'errors': 'Không tìm thấy đánh giá.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReviewSerializer(review).data, status=status.HTTP_200_OK)


class ReviewModerationView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]
    throttle_scope = 'burst'

    def post(self, request, review_id):
        review = moderate_review(
            review_id,
            request.data.get('action'),
            request.data.get('reason', ''),
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_200_OK)
