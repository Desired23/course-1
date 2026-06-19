"""Main-flow test: homepage reviews only surface approved, non-empty reviews."""
from django.test import TestCase
from rest_framework.test import APIClient

from courses.models import Course
from courses.services import recalc_course_rating
from enrollments.models import Enrollment
from reviews.models import Review
from utils.test_helpers import auth_client, make_user


class HomepageReviewListViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.course = Course.objects.create(title="Django Basics", status=Course.Status.PUBLISHED)

    def _review(self, **kwargs):
        defaults = {
            "course": self.course,
            "user": make_user("student", username=f"review_student_{Review.objects.count() + 1}"),
            "rating": 5,
            "comment": "Great course",
            "status": Review.StatusChoices.APPROVED,
        }
        defaults.update(kwargs)
        return Review.objects.create(**defaults)

    def test_homepage_reviews_only_return_approved_selected_reviews_in_order(self):
        first = self._review(comment="First approved")
        pending = self._review(comment="Pending review", status=Review.StatusChoices.PENDING)
        deleted = self._review(comment="Deleted approved", is_deleted=True)
        second = self._review(comment="Second approved")

        response = self.client.get(
            "/api/reviews/homepage/",
            {"ids": f"{second.id},{pending.id},{first.id},{deleted.id}", "limit": "10"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["review_id"] for item in response.data], [second.id, first.id])

    def test_homepage_reviews_exclude_empty_comments(self):
        self._review(comment="")
        visible = self._review(comment="Useful feedback")

        response = self.client.get("/api/reviews/homepage/", {"limit": "10"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["review_id"] for item in response.data], [visible.id])


class ReviewWriteFlowTests(TestCase):
    def setUp(self):
        self.admin = make_user("admin", username="review_admin")
        self.instructor_user = make_user("instructor", username="review_instructor")
        self.student = make_user("student", username="review_owner")
        self.course = Course.objects.create(
            title="Django Basics",
            status=Course.Status.PUBLISHED,
            instructor=self.instructor_user.instructor,
        )
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.Status.Active,
            progress=75,
        )

    def test_second_review_submission_updates_existing_review(self):
        client = auth_client(self.student)

        first = client.post(
            "/api/reviews/create/",
            {"course": self.course.id, "rating": 5, "comment": "Good"},
            format="json",
        )
        self.assertEqual(first.status_code, 201, first.content)

        second = client.post(
            "/api/reviews/create/",
            {"course": self.course.id, "rating": 2, "comment": "Updated"},
            format="json",
        )
        self.assertEqual(second.status_code, 201, second.content)
        self.assertEqual(Review.objects.filter(user=self.student, course=self.course, is_deleted=False).count(), 1)

        review = Review.objects.get(user=self.student, course=self.course, is_deleted=False)
        self.assertEqual(review.rating, 2)
        self.assertEqual(review.comment, "Updated")
        self.course.refresh_from_db()
        self.assertEqual(self.course.total_reviews, 1)
        self.assertEqual(str(self.course.rating), "2.00")

    def test_student_cannot_set_instructor_response_on_own_review(self):
        review = Review.objects.create(
            course=self.course,
            user=self.student,
            rating=4,
            comment="Original",
            status=Review.StatusChoices.APPROVED,
        )
        client = auth_client(self.student)

        response = client.patch(
            f"/api/reviews/update/{review.id}/",
            {"comment": "Edited", "instructor_response": "Fake reply"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        review.refresh_from_db()
        self.assertEqual(review.comment, "Edited")
        self.assertIsNone(review.instructor_response)

    def test_course_instructor_can_add_instructor_response(self):
        review = Review.objects.create(
            course=self.course,
            user=self.student,
            rating=4,
            comment="Helpful",
            status=Review.StatusChoices.APPROVED,
        )
        client = auth_client(self.instructor_user)

        response = client.patch(
            f"/api/reviews/update/{review.id}/",
            {"instructor_response": "Thanks for learning and sharing feedback."},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        review.refresh_from_db()
        self.assertEqual(review.instructor_response, "Thanks for learning and sharing feedback.")
        self.assertIsNotNone(review.response_at)

    def test_course_rating_includes_pending_and_excludes_rejected_reviews(self):
        Review.objects.create(
            course=self.course,
            user=make_user("student", username="rating_approved"),
            rating=4,
            comment="Approved",
            status=Review.StatusChoices.APPROVED,
        )
        Review.objects.create(
            course=self.course,
            user=make_user("student", username="rating_pending"),
            rating=2,
            comment="Pending",
            status=Review.StatusChoices.PENDING,
        )
        Review.objects.create(
            course=self.course,
            user=make_user("student", username="rating_rejected"),
            rating=1,
            comment="Rejected",
            status=Review.StatusChoices.REJECTED,
        )

        recalc_course_rating(self.course.id)

        self.course.refresh_from_db()
        self.assertEqual(self.course.total_reviews, 2)
        self.assertEqual(float(self.course.rating), 3.0)

    def test_hidden_review_is_excluded_publicly_but_visible_to_admin_list(self):
        visible = Review.objects.create(
            course=self.course,
            user=self.student,
            rating=5,
            comment="Visible",
            status=Review.StatusChoices.APPROVED,
        )
        hidden = Review.objects.create(
            course=self.course,
            user=make_user("student", username="hidden_review_owner"),
            rating=1,
            comment="Hidden",
            status=Review.StatusChoices.REJECTED,
        )

        public_response = APIClient().get("/api/reviews/", {"course_id": self.course.id, "page_size": 100})
        self.assertEqual(public_response.status_code, 200, public_response.content)
        self.assertEqual(
            [item["review_id"] for item in public_response.data["results"]],
            [visible.id],
        )

        admin_response = auth_client(self.admin).get(
            "/api/reviews/",
            {"include_hidden": "true", "page_size": 100},
        )
        self.assertEqual(admin_response.status_code, 200, admin_response.content)
        self.assertIn(hidden.id, [item["review_id"] for item in admin_response.data["results"]])

    def test_mine_filter_returns_hidden_review_for_owner(self):
        hidden = Review.objects.create(
            course=self.course,
            user=self.student,
            rating=1,
            comment="Hidden",
            status=Review.StatusChoices.REJECTED,
        )
        client = auth_client(self.student)

        response = client.get(
            "/api/reviews/",
            {"mine": "true", "course_id": self.course.id, "page_size": 1},
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual([item["review_id"] for item in response.data["results"]], [hidden.id])
