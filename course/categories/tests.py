from django.test import TestCase

from categories.models import Category
from categories.services import get_top_categories
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
