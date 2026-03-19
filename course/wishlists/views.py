from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db.models import Q
from .services import (
    create_wishlist,
    get_wishlist_by_id,
    get_wishlists_by_user,
    get_all_wishlists,
    update_wishlist,
    delete_wishlist
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import WishlistSerializer

class WishlistListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'
    def get(self, request):
        try:
            if 'user_id' in request.query_params:
                user_id = request.query_params.get('user_id')
                wishlists = get_wishlists_by_user(user_id)

                search = (request.query_params.get('search') or '').strip()
                level = request.query_params.get('level')
                sort_by = request.query_params.get('sort_by')

                if search:
                    wishlists = wishlists.filter(
                        Q(course__title__icontains=search)
                        | Q(course__instructor__user__full_name__icontains=search)
                    )
                if level:
                    wishlists = wishlists.filter(course__level=level)

                if sort_by == 'title_asc':
                    wishlists = wishlists.order_by('course__title')
                elif sort_by == 'oldest':
                    wishlists = wishlists.order_by('created_at')
                else:
                    wishlists = wishlists.order_by('-created_at')

                return paginate_queryset(wishlists, request, WishlistSerializer)
            elif 'wishlist_id' in request.query_params:
                wishlist_id = request.query_params.get('wishlist_id')
                wishlist = get_wishlist_by_id(wishlist_id)
                return Response(wishlist, status=status.HTTP_200_OK)
            else:
                wishlists = get_all_wishlists()
                return paginate_queryset(wishlists, request, WishlistSerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)
    def post(self, request):
        try:
            wishlist = create_wishlist(request.data)
            return Response(wishlist, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, wishlist_id):
        try:
            wishlist = update_wishlist(wishlist_id, request.data)
            return Response(wishlist, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, wishlist_id):
        try:
            result = delete_wishlist(wishlist_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)
