from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from admins.models import Admin
from courses.models import Course
from payment_details.models import Payment_Details
from payments.models import Payment
from instructors.models import Instructor
from promotions.models import Promotion
from promotions.serializers import PromotionSerializer
from promotions.services import create_promotion
from users.models import User


class CreatePromotionActorTests(TestCase):
    def _user(self, username):
        return User.objects.create(
            username=username,
            email=f'{username}@example.com',
            password_hash='test',
            full_name=username,
        )

    def test_create_promotion_uses_admin_from_user_when_id_is_missing(self):
        user = self._user('admin-user')
        admin = Admin.objects.create(user=user, department='Ops', role='admin')

        result = create_promotion({
            'code': 'ADMIN10',
            'discount_type': Promotion.DiscountTypeChoices.PERCENTAGE,
            'discount_value': 10,
            'start_date': timezone.now().isoformat(),
            'end_date': (timezone.now() + timedelta(days=7)).isoformat(),
            'status': Promotion.StatusChoices.ACTIVE,
        }, user=user)

        promotion = Promotion.objects.get(id=result['id'])
        self.assertEqual(promotion.admin_id, admin.id)
        self.assertIsNone(promotion.instructor_id)

    def test_create_promotion_uses_instructor_from_user_when_id_is_missing(self):
        user = self._user('instructor-user')
        instructor = Instructor.objects.create(user=user)
        course = Course.objects.create(
            title='Python Basics',
            instructor=instructor,
            price=100,
        )

        result = create_promotion({
            'code': 'TEACHER10',
            'discount_type': Promotion.DiscountTypeChoices.PERCENTAGE,
            'discount_value': 10,
            'start_date': timezone.now().isoformat(),
            'end_date': (timezone.now() + timedelta(days=7)).isoformat(),
            'applicable_courses': [course.id],
            'status': Promotion.StatusChoices.ACTIVE,
        }, user=user)

        promotion = Promotion.objects.get(id=result['id'])
        self.assertEqual(promotion.instructor_id, instructor.id)
        self.assertIsNone(promotion.admin_id)
        self.assertEqual(list(promotion.applicable_courses.values_list('id', flat=True)), [course.id])


class PromotionRevenueImpactTests(TestCase):
    def _user(self, username):
        return User.objects.create(
            username=username,
            email=f'{username}@example.com',
            password_hash='test',
            full_name=username,
        )

    def test_revenue_impact_uses_actual_completed_discount_amounts(self):
        admin = Admin.objects.create(user=self._user('impact-admin'), department='Ops', role='admin')
        instructor = Instructor.objects.create(user=self._user('impact-instructor'))
        student = self._user('impact-student')
        course = Course.objects.create(title='Revenue Course', instructor=instructor, price=200)
        admin_promotion = Promotion.objects.create(
            code='ORDER50',
            admin=admin,
            discount_type=Promotion.DiscountTypeChoices.FIXED_AMOUNT,
            discount_value=50,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=7),
        )
        instructor_promotion = Promotion.objects.create(
            code='LINE20',
            instructor=instructor,
            discount_type=Promotion.DiscountTypeChoices.FIXED_AMOUNT,
            discount_value=20,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=7),
        )
        payment = Payment.objects.create(
            user=student,
            amount=200,
            discount_amount=70,
            total_amount=130,
            payment_status=Payment.PaymentStatus.COMPLETED,
            promotion=admin_promotion,
        )
        Payment_Details.objects.create(
            payment=payment,
            course=course,
            price=200,
            discount=20,
            final_price=180,
            promotion=instructor_promotion,
        )

        self.assertEqual(PromotionSerializer(admin_promotion).data['revenue_impact'], '50.00')
        self.assertEqual(PromotionSerializer(instructor_promotion).data['revenue_impact'], '20.00')
