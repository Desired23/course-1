import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from admins.models import Admin
from categories.models import Category
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from users.models import User

from .models import BlogPost


def build_access_token(user):
    payload = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "user_type": [user.user_type],
        "token_type": "access",
        "exp": 9999999999,
        "iat": 1,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


class BlogPostActorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name="Blog Category", status="active")
        self.instructor = User.objects.create(
            username="blog-inst",
            email="blog-inst@example.com",
            password_hash="hashed",
            full_name="Blog Instructor",
            user_type="instructor",
            status="active",
        )
        level = InstructorLevel.objects.create(
            name="Blog Level",
            min_students=0,
            min_revenue=0,
            commission_rate=10,
            plan_commission_rate=10,
        )
        Instructor.objects.create(user=self.instructor, level=level)
        self.other_instructor = User.objects.create(
            username="blog-other",
            email="blog-other@example.com",
            password_hash="hashed",
            full_name="Other Instructor",
            user_type="instructor",
            status="active",
        )
        Instructor.objects.create(user=self.other_instructor, level=level)
        self.admin_user = User.objects.create(
            username="blog-admin",
            email="blog-admin@example.com",
            password_hash="hashed",
            full_name="Blog Admin",
            user_type="admin",
            status="active",
        )
        Admin.objects.create(user=self.admin_user, department="IT", role="super_admin")

    def _auth(self, user):
        token = build_access_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_create_blog_post_ignores_payload_author(self):
        self._auth(self.instructor)
        response = self.client.post(
            "/api/admin/blog-posts/create/",
            {
                "title": "Author Locked",
                "content": "Body",
                "author": self.other_instructor.id,
                "status": BlogPost.StatusChoices.PUBLISHED,
                "slug": "author-locked",
                "category": self.category.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        post = BlogPost.objects.get(slug="author-locked")
        self.assertEqual(post.author_id, self.instructor.id)

    def test_instructor_cannot_edit_other_instructors_post(self):
        post = BlogPost.objects.create(
            title="Other Post",
            content="Body",
            author=self.other_instructor,
            status=BlogPost.StatusChoices.PUBLISHED,
            slug="other-post",
            category=self.category,
        )
        self._auth(self.instructor)

        response = self.client.patch(
            f"/api/admin/blog-posts/update/{post.id}/",
            {"title": "Hijacked"},
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.content)
        post.refresh_from_db()
        self.assertEqual(post.title, "Other Post")
