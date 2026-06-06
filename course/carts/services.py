from rest_framework.exceptions import ValidationError
from .models import Cart
from .serializers import CartSerializer
from enrollments.models import Enrollment
from utils.course_access import get_course_access_info

def create_cart(data):
    try:
        user_id = data.get('user')
        course_id = data.get('course')

        if user_id and course_id:

            already_in_cart = Cart.objects.filter(
                user_id=user_id,
                course_id=course_id
            ).exists()
            if already_in_cart:
                raise ValidationError("Khóa học này đã có trong giỏ hàng.")


            already_enrolled = Enrollment.objects.filter(
                user_id=user_id,
                course_id=course_id,
                is_deleted=False,
                status__in=[Enrollment.Status.Active, Enrollment.Status.Complete]
            ).exists()
            if already_enrolled:
                raise ValidationError("Bạn đã sở hữu khóa học này. Không thể thêm vào giỏ hàng.")

        serializer = CartSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            cart = serializer.save()

            cart = Cart.objects.select_related(
                'course__instructor__user', 'course__category'
            ).get(pk=cart.pk)
            return CartSerializer(cart).data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating cart: {str(e)}")

def get_cart_by_id(cart_id):
    try:
        cart = Cart.objects.get(pk=cart_id)
        serializer = CartSerializer(cart)
        return serializer.data
    except Cart.DoesNotExist:
        raise ValidationError({"error": "Cart not found."})

def get_all_carts():
    carts = Cart.objects.select_related(
        'course__instructor__user', 'course__category'
    ).all()
    return carts

def get_cart_by_user(user_id):
    carts = list(
        Cart.objects.select_related(
            'course__instructor__user', 'course__category',
            'user__admin', 'user__instructor',
        ).filter(user=user_id).order_by('-created_at')
    )

    owned_ids = []
    remaining = []
    for cart in carts:
        if cart.course is None:
            remaining.append(cart)
            continue
        info = get_course_access_info(cart.user, cart.course)
        access_type = info.get('access_type')
        # Course bought outright -> remove from cart. (Admin/instructor "access"
        # is not a purchase, so their cart items are left untouched.)
        if access_type == 'purchase':
            owned_ids.append(cart.id)
            continue
        # Covered by an active subscription/plan -> keep, but tag so the UI can
        # offer buying it permanently.
        cart._in_plan = access_type == 'subscription'
        remaining.append(cart)

    if owned_ids:
        Cart.objects.filter(id__in=owned_ids).delete()

    return remaining
def update_cart(cart_id, data):
    try:
        cart = Cart.objects.get(pk=cart_id)
        serializer = CartSerializer(cart, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Cart.DoesNotExist:
        raise ValidationError({"error": "Cart not found."})
    except Exception as e:
        raise ValidationError(f"Error updating cart: {str(e)}")

def delete_cart(cart_id):
    try:
        cart = Cart.objects.get(pk=cart_id)
        cart.delete()
        return {"message": "Cart deleted successfully."}
    except Cart.DoesNotExist:
        raise ValidationError({"error": "Cart not found."})


def bulk_delete_cart(user_id, cart_ids):
    if not isinstance(cart_ids, list) or not cart_ids:
        raise ValidationError({"error": "cart_ids phải là danh sách không rỗng."})

    normalized_ids = []
    for raw_id in cart_ids:
        try:
            normalized_ids.append(int(raw_id))
        except (TypeError, ValueError):
            raise ValidationError({"error": f"cart_id không hợp lệ: {raw_id}"})

    id_set = set(normalized_ids)
    existing_rows = Cart.objects.filter(id__in=id_set).values('id', 'user_id')
    existing_ids = {row['id'] for row in existing_rows}
    owned_ids = {row['id'] for row in existing_rows if row['user_id'] == int(user_id)}

    unauthorized_ids = sorted(existing_ids - owned_ids)
    missing_ids = sorted(id_set - existing_ids)

    deleted_count, _ = Cart.objects.filter(user_id=user_id, id__in=owned_ids).delete()

    return {
        "message": "Bulk cart delete completed.",
        "deleted_count": deleted_count,
        "deleted_ids": sorted(owned_ids),
        "missing_ids": missing_ids,
        "unauthorized_ids": unauthorized_ids,
    }
