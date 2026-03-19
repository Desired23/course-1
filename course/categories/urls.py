from django.urls import path
from .views import (
    CategoryListView,
    CategoryDetailView,
    CategoryManagementView,
    ActiveCategoryListView,
    SubcategoryListView,
    TopCategoryListView
)

urlpatterns =[
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('categories/create', CategoryManagementView.as_view(), name='category-create'),
    path('categories/<int:category_id>/delete', CategoryManagementView.as_view(), name='category-delete'),
    path('categories/<int:category_id>/update', CategoryManagementView.as_view(), name='category-update-admin'),
    path('categories/<int:category_id>', CategoryDetailView.as_view(), name='category-detail'),
    path('categories/active', ActiveCategoryListView.as_view(), name='active-category-list'),
    path('categories/top', TopCategoryListView.as_view(), name='top-category-list'),
    path('categories/<int:category_id>/subcategories', SubcategoryListView.as_view(), name='subcategory-list'),
]
