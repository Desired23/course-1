from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
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