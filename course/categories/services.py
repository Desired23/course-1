from rest_framework.exceptions import ValidationError
from django.db.models import Count, Q
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
    return categories
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
        return subcategories
    except Category.DoesNotExist:
        raise ValidationError({"error": "Category not found."})
def get_active_categories():
    return Category.objects.filter(status='active')


def get_top_categories(limit=6):
    return (
        Category.objects
        .filter(status='active', parent_category__isnull=True)
        .annotate(
            course_count=Count(
                'category_courses',
                filter=Q(
                    category_courses__status='published',
                    category_courses__is_public=True,
                    category_courses__is_deleted=False,
                ),
            )
        )
        .filter(course_count__gt=0)
        .order_by('-course_count', 'name')[:limit]
    )

