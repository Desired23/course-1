from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone


def as_decimal(value):
    return Decimal(value or 0)


def refund_window_days():
    return int(getattr(settings, 'REFUND_DAYS', 30))


def refund_cutoff_time(now=None):
    return (now or timezone.now()) - timedelta(days=refund_window_days())


def payment_is_outside_refund_window(payment, now=None):
    if not payment or not payment.payment_date:
        return False
    return payment.payment_date <= refund_cutoff_time(now)


def success_refund_amount(detail):
    from payment_details.models import Payment_Details

    if not detail or detail.refund_status != Payment_Details.RefundStatus.SUCCESS:
        return Decimal('0')
    return as_decimal(detail.refund_amount)


def detail_has_open_refund(detail):
    from payment_details.models import Payment_Details

    if not detail:
        return False
    if detail.refund_status in {
        Payment_Details.RefundStatus.PROCESSING,
        Payment_Details.RefundStatus.APPROVED,
    }:
        return True
    return detail.refund_status == Payment_Details.RefundStatus.PENDING and bool(detail.refund_request_time)


def detail_is_fully_refunded(detail, amount=None):
    total = as_decimal(amount if amount is not None else getattr(detail, 'final_price', 0))
    return total > 0 and success_refund_amount(detail) >= total


def detail_is_refund_eligible(detail, enrollment, now=None):
    from enrollments.models import Enrollment
    from payment_details.models import Payment_Details

    if not detail or detail_has_open_refund(detail):
        return False
    if detail.refund_request_time or detail.refund_status in {
        Payment_Details.RefundStatus.SUCCESS,
        Payment_Details.RefundStatus.REJECTED,
        Payment_Details.RefundStatus.FAILED,
        Payment_Details.RefundStatus.CANCELLED,
    }:
        return False
    if payment_is_outside_refund_window(detail.payment, now):
        return False
    if not enrollment or enrollment.status != Enrollment.Status.Active:
        return False
    if as_decimal(enrollment.progress) > Decimal('50'):
        return False
    now = now or timezone.now()
    if enrollment.expiry_date and enrollment.expiry_date < now:
        return False
    return True


def detail_is_final_for_report(detail, enrollment=None, amount=None, now=None):
    if detail_has_open_refund(detail):
        return False
    if detail_is_fully_refunded(detail, amount):
        return True
    return not detail_is_refund_eligible(detail, enrollment, now)


def subscription_payment_is_final_for_report(payment, amount=None, now=None):
    total = as_decimal(amount if amount is not None else getattr(payment, 'total_amount', 0))
    refunded = as_decimal(getattr(payment, 'refund_amount', 0))
    return (total > 0 and refunded >= total) or payment_is_outside_refund_window(payment, now)


def _first_matching(iterable, predicate):
    return next((item for item in iterable if predicate(item)), None)


def earning_payment_detail(earning):
    if not earning.payment_id or not earning.course_id:
        return None
    details = getattr(earning.payment, 'payment_details', None)
    if details is None:
        return None
    try:
        iterable = details.all()
    except TypeError:
        iterable = details
    return _first_matching(iterable, lambda item: item.course_id == earning.course_id and not item.is_deleted)


def earning_enrollment(earning):
    if not earning.payment_id or not earning.course_id:
        return None
    enrollments = getattr(earning.payment, 'enrollments', None)
    if enrollments is None:
        return None
    try:
        iterable = enrollments.all()
    except TypeError:
        iterable = enrollments
    return _first_matching(iterable, lambda item: item.course_id == earning.course_id and not item.is_deleted)


def earning_is_final_for_report(earning, now=None):
    if earning.payment_id:
        detail = earning_payment_detail(earning)
        enrollment = earning_enrollment(earning)
        amount = getattr(detail, 'final_price', None) if detail else earning.amount
        return detail_is_final_for_report(detail, enrollment, amount, now)

    if earning.user_subscription_id:
        payment = getattr(getattr(earning, 'user_subscription', None), 'payment', None)
        if payment:
            return subscription_payment_is_final_for_report(payment, earning.amount, now)
        return getattr(earning, 'status', None) in {'available', 'paid'}

    return getattr(earning, 'status', None) in {'available', 'paid'}
