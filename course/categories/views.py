from .services import (
    create_category,
    update_category,
    delete_category,
    get_categories,
    get_category_by_id,
    get_active_categories,
    get_subcategories
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .serializers import CategoriesSerializer
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset

class CategoryListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request):
        try:
            categories = get_categories()
            return paginate_queryset(categories, request, CategoriesSerializer)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)
        
class CategoryDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def get(self, request, category_id):
        try:
            category = get_category_by_id(category_id)
            return Response(category, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)
    
class CategoryManagementView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor'])]
    throttle_scope = 'burst'

    def post(self, request):
        try:
            category = create_category(request.data)
            return Response(CategoriesSerializer(category).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def patch(self, request, category_id):
        try:
            updated_category = update_category(category_id, request.data)
            return Response(CategoriesSerializer(updated_category).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, category_id):
        try:
            result = delete_category(category_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_404_NOT_FOUND)
class ActiveCategoryListView(APIView):
    throttle_scope = 'search'
    def get(self, request):
        try:
            categories = get_active_categories()
            return paginate_queryset(categories, request, CategoriesSerializer)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)

class SubcategoryListView(APIView):
    throttle_scope = 'search'
    def get(self, request, category_id):
        try:
            subcategories = get_subcategories(category_id)
            return paginate_queryset(subcategories, request, CategoriesSerializer)
        except ValidationError as e:
            return Response({"error": e.detail}, status=status.HTTP_404_NOT_FOUND)



