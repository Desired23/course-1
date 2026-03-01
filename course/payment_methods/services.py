from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import UserPaymentMethod, InstructorPayoutMethod


# ─── User Payment Methods ────────────────────────────────────────────────────

def get_user_payment_methods(user_id):
    return UserPaymentMethod.objects.filter(user_id=user_id, is_deleted=False)


def get_user_payment_method(method_id, user_id):
    try:
        return UserPaymentMethod.objects.get(id=method_id, user_id=user_id, is_deleted=False)
    except UserPaymentMethod.DoesNotExist:
        raise ValidationError({"error": "Payment method not found."})


def create_user_payment_method(user, data):
    method_type = data.get('method_type')
    is_default = data.get('is_default', False)

    # If this is set as default, unset other defaults first
    if is_default:
        UserPaymentMethod.objects.filter(user=user, is_deleted=False).update(is_default=False)

    method = UserPaymentMethod.objects.create(
        user=user,
        method_type=method_type,
        is_default=is_default,
        nickname=data.get('nickname'),
        gateway_token=data.get('gateway_token'),
        masked_account=data.get('masked_account'),
        bank_name=data.get('bank_name'),
        bank_branch=data.get('bank_branch'),
        account_number=data.get('account_number'),
        account_name=data.get('account_name'),
    )
    return method


def update_user_payment_method(method_id, user, data):
    method = get_user_payment_method(method_id, user.id)

    is_default = data.get('is_default')
    if is_default:
        UserPaymentMethod.objects.filter(user=user, is_deleted=False).update(is_default=False)

    for field in ('nickname', 'is_default', 'masked_account', 'bank_name',
                  'bank_branch', 'account_number', 'account_name', 'gateway_token'):
        if field in data:
            setattr(method, field, data[field])
    method.save()
    return method


def delete_user_payment_method(method_id, user):
    method = get_user_payment_method(method_id, user.id)
    method.is_deleted = True
    method.deleted_at = timezone.now()
    method.save()


def set_default_user_payment_method(method_id, user):
    UserPaymentMethod.objects.filter(user=user, is_deleted=False).update(is_default=False)
    method = get_user_payment_method(method_id, user.id)
    method.is_default = True
    method.save()
    return method


# ─── Instructor Payout Methods ───────────────────────────────────────────────

def get_instructor_payout_methods(instructor_id):
    return InstructorPayoutMethod.objects.filter(instructor_id=instructor_id, is_deleted=False)


def get_instructor_payout_method(method_id, instructor_id):
    try:
        return InstructorPayoutMethod.objects.get(id=method_id, instructor_id=instructor_id, is_deleted=False)
    except InstructorPayoutMethod.DoesNotExist:
        raise ValidationError({"error": "Payout method not found."})


def create_instructor_payout_method(instructor, data):
    is_default = data.get('is_default', False)

    if is_default:
        InstructorPayoutMethod.objects.filter(instructor=instructor, is_deleted=False).update(is_default=False)

    method = InstructorPayoutMethod.objects.create(
        instructor=instructor,
        method_type=data.get('method_type'),
        is_default=is_default,
        nickname=data.get('nickname'),
        bank_name=data.get('bank_name'),
        bank_branch=data.get('bank_branch'),
        account_number=data.get('account_number'),
        account_name=data.get('account_name'),
        wallet_phone=data.get('wallet_phone'),
        masked_account=data.get('masked_account'),
    )
    return method


def update_instructor_payout_method(method_id, instructor, data):
    method = get_instructor_payout_method(method_id, instructor.id)

    is_default = data.get('is_default')
    if is_default:
        InstructorPayoutMethod.objects.filter(instructor=instructor, is_deleted=False).update(is_default=False)

    for field in ('nickname', 'is_default', 'bank_name', 'bank_branch',
                  'account_number', 'account_name', 'wallet_phone', 'masked_account'):
        if field in data:
            setattr(method, field, data[field])
    method.save()
    return method


def delete_instructor_payout_method(method_id, instructor):
    method = get_instructor_payout_method(method_id, instructor.id)
    method.is_deleted = True
    method.deleted_at = timezone.now()
    method.save()


def set_default_instructor_payout_method(method_id, instructor):
    InstructorPayoutMethod.objects.filter(instructor=instructor, is_deleted=False).update(is_default=False)
    method = get_instructor_payout_method(method_id, instructor.id)
    method.is_default = True
    method.save()
    return method
