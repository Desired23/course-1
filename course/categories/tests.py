from django.test import TestCase

from categories.models import Category
from categories.services import get_active_categories, get_top_categories
from courses.models import Course


class TopCategoryServiceTests(TestCase):
    def test_orders_top_categories_by_course_count(self):
        one_course = Category.objects.create(name="One Course", order=0, status="active")
        three_courses = Category.objects.create(name="Three Courses", order=10, status="active")
        two_courses = Category.objects.create(name="Two Courses", order=5, status="active")

        for index in range(3):
            Course.objects.create(
                title=f"Three Courses {index}",
                category=three_courses,
                status=Course.Status.PUBLISHED,
                is_public=True,
            )
        for index in range(2):
            Course.objects.create(
                title=f"Two Courses {index}",
                category=two_courses,
                status=Course.Status.PUBLISHED,
                is_public=True,
            )
        Course.objects.create(
            title="One Course 0",
            category=one_course,
            status=Course.Status.PUBLISHED,
            is_public=True,
        )

        categories = list(get_top_categories(limit=3))

        self.assertEqual([category.id for category in categories], [
            three_courses.id,
            two_courses.id,
            one_course.id,
        ])
        self.assertEqual([category.course_count for category in categories], [3, 2, 1])


class ActiveCategoryServiceTests(TestCase):
    def test_can_filter_active_categories_to_only_categories_with_courses(self):
        parent = Category.objects.create(name="Parent", status="active")
        subcategory = Category.objects.create(
            name="Subcategory",
            parent_category=parent,
            status="active",
        )
        empty = Category.objects.create(name="Empty", status="active")
        draft_only = Category.objects.create(name="Draft Only", status="active")
        inactive = Category.objects.create(name="Inactive", status="inactive")

        Course.objects.create(
            title="Published Course",
            category=parent,
            subcategory=subcategory,
            status=Course.Status.PUBLISHED,
            is_public=True,
        )
        Course.objects.create(
            title="Draft Course",
            category=draft_only,
            status=Course.Status.DRAFT,
            is_public=True,
        )
        Course.objects.create(
            title="Inactive Category Course",
            category=inactive,
            status=Course.Status.PUBLISHED,
            is_public=True,
        )

        categories = list(get_active_categories(has_courses=True))

        self.assertIn(parent, categories)
        self.assertIn(subcategory, categories)
        self.assertNotIn(empty, categories)
        self.assertNotIn(draft_only, categories)
        self.assertNotIn(inactive, categories)
