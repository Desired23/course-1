from rest_framework.exceptions import ValidationError
from .models import Category
from .serializers import CategoriesSerializer

def create_category(data):
    serializer = CategoriesSerializer(data=data)
    if serializer.is_valid(raise_exception=True):
        category = serializer.save()
        return category
    raise ValidationError(serializer.errors)

def get_categories():
    categories = Category.objects.all()
    if not categories.exists():
        raise ValidationError({"error": "No categories found."})
    serializer = CategoriesSerializer(categories, many=True)
    return serializer.data
def get_category_by_id(category_id):
    try:
        category = Category.objects.get(id=category_id)
        serializer = CategoriesSerializer(category)
        return serializer.data
    except Category.DoesNotExist:
        raise ValidationError({"error": "Category not found."})
def update_category(category_id, data):
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        raise ValidationError({"error": "Category not found."})

    serializer = CategoriesSerializer(category, data=data, partial=True)
    if serializer.is_valid(raise_exception=True):
        updated_category = serializer.save()
        return updated_category
    raise ValidationError(serializer.errors)
def delete_category(category_id):
    try:
        category = Category.objects.get(id=category_id)
        category.delete()
        return {"message": "Category deleted successfully."}
    except Category.DoesNotExist:
        raise ValidationError({"error": "Category not found."})
def get_subcategories(category_id):
    try:
        category = Category.objects.get(id=category_id)
        subcategories = Category.objects.filter(parent_category=category)
        if not subcategories.exists():
            raise ValidationError({"error": "No subcategories found."})
        serializer = CategoriesSerializer(subcategories, many=True)
        return serializer.data
    except Category.DoesNotExist:
        raise ValidationError({"error": "Category not found."})
def get_active_categories():
    categories = Category.objects.filter(status='active')
    if not categories.exists():
        raise ValidationError({"error": "No active categories found."})
    serializer = CategoriesSerializer(categories, many=True)
    return serializer.data

