from rest_framework.exceptions import ValidationError
from .serializers import InstructorEarningSerializer
from .models import InstructorEarning
from django.db import transaction
from django.utils import timezone
from instructor_payouts.models import InstructorPayout
from decimal import Decimal
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from payments.models import Payment

def generate_instructor_earnings_from_payment(payment_id):
    try:
        with transaction.atomic():
            payment = Payment.objects.prefetch_related(
                'payment_details__course__instructor'
            ).get(id=payment_id)
            results = []
            print("ok")
            # print("payment:", payment.__dict__)

            for detail in payment.payment_details.all():
                instructor = detail.course.instructor
                # print("detail:", detail.__dict__)
                if not instructor:
                    continue  # Bỏ qua nếu chưa gán instructor cho khóa học

                # Tính commission_rate
                if not instructor or not instructor.level:
                    commission_rate = Decimal("30.00")
                else:
                    commission_rate = instructor.level.commission_rate

                amount = detail.final_price
                net_amount = amount * (Decimal(100) - commission_rate) / Decimal(100)

                earning = InstructorEarning.objects.create(
                    instructor=instructor,
                    course=detail.course,
                    payment=payment,
                    amount=amount,
                    net_amount=net_amount,
                    status=InstructorEarning.StatusChoices.PENDING,
                    earning_date=timezone.now()
                )

                results.append(InstructorEarningSerializer(earning).data)

            return results

    except Payment.DoesNotExist:
        raise ValidationError("Không tìm thấy Payment.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi tạo earnings cho giảng viên: {str(e)}")
def get_instructor_earnings_by_instructor_id(instructor_id, status=None):
    try:
        instructor = Instructor.objects.get(id=instructor_id)
        earnings = InstructorEarning.objects.filter(instructor=instructor)

        if status:
            earnings = earnings.filter(status=status)

        return earnings

    except Instructor.DoesNotExist:
        raise ValidationError("Không tìm thấy giảng viên.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi lấy earnings của giảng viên: {str(e)}")
def get_instructor_earnings(status=None, earning_id=None):
    try:
        if earning_id:
            earning = InstructorEarning.objects.get(id=earning_id)
            return InstructorEarningSerializer(earning).data
        else:
            earnings = InstructorEarning.objects.all()
            if status:
                earnings = earnings.filter(status=status)
            return earnings


    except Exception as e:
        raise ValidationError(f"Lỗi khi lấy tất cả earnings của giảng viên: {str(e)}")
def update_instructor_earning_status(earning_id, new_status):
    try:
        if new_status not in [choice[0] for choice in InstructorEarning.StatusChoices.choices]:
            raise ValidationError("Trạng thái không hợp lệ.")
        earning = InstructorEarning.objects.get(id=earning_id)
        if earning.status == 'paid':
            raise ValidationError("Thu nhập đã được thanh toán, không thể cập nhật.")
        earning.status = new_status
        earning.save()

        return InstructorEarningSerializer(earning).data

    except InstructorEarning.DoesNotExist:
        raise ValidationError("Không tìm thấy earnings.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi cập nhật trạng thái earnings: {str(e)}")
def update_instructor_earning_with_payout(payout_id):
# gán trạng thái cho earnings từ payout khi đã thanh toán hoặc hủy ,
# chỉ chuyển từ AVAILABLE sang PAID hoặc CANCELLED
    try:
        with transaction.atomic():
            payout = InstructorPayout.objects.prefetch_related(
                'earnings__instructor_id__user_id'
            ).get(instructor_payout=payout_id)

            earnings = payout.earnings.all()

            if payout.status == InstructorPayout.PayoutStatusChoices.PROCESSED:
                new_status = InstructorEarning.StatusChoices.PAID
                assign_payout = payout
            elif payout.status in [
                InstructorPayout.PayoutStatusChoices.CANCELLED,
                InstructorPayout.PayoutStatusChoices.FAILED
            ]:
                new_status = InstructorEarning.StatusChoices.CANCELLED
                assign_payout = None
            else:
                return InstructorEarning.objects.none()  # Trạng thái không hợp lệ thì không làm gì cả

            for earning in earnings:
                if earning.status == InstructorEarning.StatusChoices.AVAILABLE:
                    earning.status = new_status
                    earning.instructor_payout_id = assign_payout
                    earning.save()
            return InstructorEarning.objects.filter(id__in=earnings.values_list('id', flat=True))
    except InstructorPayout.DoesNotExist:
        raise ValidationError("Không tìm thấy Payout.")
    except Exception as e:
        raise ValidationError(f"Lỗi khi cập nhật earnings với payout: {str(e)}")
def update_earnings_available(): #cronjob
    try:
        with transaction.atomic():
            from django.conf import settings
            refund_days= settings.REFUND_DAYS
            refund_time = timezone.now() - timezone.timedelta(days=refund_days)
            earnings = InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.PENDING,
                payment_id__payment_date__lt=refund_time
            )
            for earning in earnings:
                earning.status = InstructorEarning.StatusChoices.AVAILABLE
                earning.save()

            return InstructorEarning.objects.filter(
                status=InstructorEarning.StatusChoices.AVAILABLE,
                payment_id__payment_date__lt=refund_time
            )

    except Exception as e:
        raise ValidationError(f"Lỗi khi cập nhật earnings thành AVAILABLE: {str(e)}")

