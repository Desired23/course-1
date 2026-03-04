from rest_framework.exceptions import ValidationError
from .models import Cart
from .serializers import CartSerializer

def create_cart(data):
    try:
        serializer = CartSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            cart = serializer.save()
            # Re-fetch with select_related to ensure course_detail has all fields
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
    try:
        cart = Cart.objects.select_related(
            'course__instructor__user', 'course__category'
        ).filter(user=user_id)
        return cart
    except Cart.DoesNotExist:
        raise ValidationError({"error": "Cart not found for this user."})
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
