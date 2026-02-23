from rest_framework.exceptions import ValidationError
from .models import Wishlist
from .serializers import WishlistSerializer

def create_wishlist(data):
    try:
        serializer = WishlistSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            wishlist = serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Exception as e:
        raise ValidationError(f"Error creating wishlist: {str(e)}")

def get_wishlist_by_id(wishlist_id):
    try:
        wishlist = Wishlist.objects.get(pk=wishlist_id)
        serializer = WishlistSerializer(wishlist)
        return serializer.data
    except Wishlist.DoesNotExist:
        raise ValidationError({"error": "Wishlist not found."})
    except Exception as e:
        raise ValidationError(f"Error retrieving wishlist: {str(e)}")

def get_all_wishlists():
    try:
        wishlists = Wishlist.objects.all()
        return wishlists
    except Exception as e:
        raise ValidationError(f"Error retrieving wishlists: {str(e)}")

def get_wishlists_by_user(user_id):
    try:
        wishlists = Wishlist.objects.filter(user=user_id)
        return wishlists
    except Exception as e:
        raise ValidationError(f"Error retrieving wishlists for user: {str(e)}")

def update_wishlist(wishlist_id, data):
    try:
        wishlist = Wishlist.objects.get(pk=wishlist_id)
        serializer = WishlistSerializer(wishlist, data=data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return serializer.data
        else:
            raise ValidationError(serializer.errors)
    except Wishlist.DoesNotExist:
        raise ValidationError({"error": "Wishlist not found."})
    except Exception as e:
        raise ValidationError(f"Error updating wishlist: {str(e)}")
def delete_wishlist(wishlist_id):
    try:
        wishlist = Wishlist.objects.get(pk=wishlist_id)
        wishlist.delete()
        return {"message": "Wishlist deleted successfully."}
    except Wishlist.DoesNotExist:
        raise ValidationError({"error": "Wishlist not found."})
    except Exception as e:
        raise ValidationError(f"Error deleting wishlist: {str(e)}")