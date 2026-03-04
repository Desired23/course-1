from rest_framework.exceptions import ValidationError
from .serializers import PromotionSerializer
from .models import Promotion
from admins.models import Admin
from courses.models import Course
from django.utils.timezone import make_aware
from instructors.models import Instructor
from users.models import User
from django.utils import timezone
from dateutil.parser import parse

def create_promotion(data):
    try:

        admin_id = data.get('admin_id')
        instructor_id = data.get('instructor_id')


        if not admin_id and not instructor_id:
            raise ValidationError({"error": "Either admin_id or instructor_id is required."})


        if admin_id:
            try:
                Admin.objects.get(id=admin_id)
            except Admin.DoesNotExist:
                raise ValidationError({"error": "Admin not found."})


        if instructor_id:
            try:
                Instructor.objects.get(id=instructor_id)
            except Instructor.DoesNotExist:
                raise ValidationError({"error": "Instructor not found."})


        end_date_str = data.get('end_date')
        if not end_date_str:
            raise ValidationError({"error": "end_date is required."})
        try:
            end_date = parse(end_date_str)
            if end_date.tzinfo is None:
                end_date = make_aware(end_date)
            if end_date < timezone.now():
                raise ValidationError({"error": "End date cannot be in the past."})
        except (ValueError, TypeError):
            raise ValidationError({"error": "Invalid end date format."})

        code = data.get('code')
        if not code:
            raise ValidationError({"error": "Promotion code is required."})
        if Promotion.objects.filter(code=code).exists():
            raise ValidationError({"error": "Promotion code already exists."})

        applicable_course_ids = data.pop('applicable_courses', [])
        if not isinstance(applicable_course_ids, list):
            raise ValidationError({"error": "applicable_courses must be a list of IDs."})

        serializer = PromotionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        promotion = serializer.save()

        if applicable_course_ids:
            courses = Course.objects.filter(pk__in=applicable_course_ids)
            if len(courses) != len(applicable_course_ids):
                raise ValidationError({"error": "Some courses not found."})
            # Verify instructor owns all applicable courses
            if instructor_id:
                for course in courses:
                    if course.instructor_id != int(instructor_id):
                        raise ValidationError(
                            {"error": f"Giảng viên không sở hữu khóa học '{course.title}' (ID={course.id})."}
                        )
            promotion.applicable_courses.set(courses)

        return PromotionSerializer(promotion).data

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Unexpected error: {str(e)}"})

def get_promotion_by_id(promotion_id):
    try:
        if not promotion_id:
            raise ValidationError({"error": "promotion_id is required"})

        promotion = (
            Promotion.objects
            .select_related('admin', 'instructor')
            .prefetch_related('applicable_courses', 'applicable_categories')
            .get(id=promotion_id)
        )

        return PromotionSerializer(promotion).data

    except Promotion.DoesNotExist:
        raise ValidationError({"error": "Promotion not found"})
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error retrieving promotion: {str(e)}"})


def get_promotions_by_admin(admin_id):
    try:
        if not admin_id:
            raise ValidationError({"error": "admin_id is required"})

        try:
            Admin.objects.get(id=admin_id)
        except Admin.DoesNotExist:
            raise ValidationError({"error": "Admin not found"})

        promotions = (
            Promotion.objects
            .filter(admin=admin_id)
            .select_related('admin', 'instructor')
            .prefetch_related('applicable_courses', 'applicable_categories')
        )
        return promotions

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error retrieving promotions: {str(e)}"})

def get_promotions_by_instructor(instructor_id):
    try:
        if not instructor_id:
            raise ValidationError({"error": "instructor_id is required"})

        try:
            Instructor.objects.get(id=instructor_id)
        except Instructor.DoesNotExist:
            raise ValidationError({"error": "Instructor not found"})

        promotions = (
            Promotion.objects
            .filter(instructor=instructor_id)
            .select_related('admin', 'instructor')
            .prefetch_related('applicable_courses', 'applicable_categories')
        )
        return promotions

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error retrieving promotions: {str(e)}"})

def delete_promotion(promotion_id):
    try:
        if not promotion_id:
            raise ValidationError({"error": "promotion_id is required"})

        promotion = Promotion.objects.get(id=promotion_id)
        promotion.delete()
        return {"message": "Promotion deleted successfully"}

    except Promotion.DoesNotExist:
        raise ValidationError({"error": "Promotion not found"})
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error deleting promotion: {str(e)}"})

def update_promotion(promotion_id, data):
    try:
        if not promotion_id:
            raise ValidationError({"error": "promotion_id is required"})

        promotion = Promotion.objects.get(id=promotion_id)

        if 'end_date' in data:
            from dateutil.parser import parse
            from django.utils import timezone
            from django.utils.timezone import make_aware
            end_date = parse(data['end_date'])
            if end_date.tzinfo is None:
                end_date = make_aware(end_date)
            if end_date < timezone.now():
                raise ValidationError({"error": "End date cannot be in the past."})

        serializer = PromotionSerializer(promotion, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return serializer.data

    except Promotion.DoesNotExist:
        raise ValidationError({"error": "Promotion not found."})
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error updating promotion: {str(e)}"})


def validate_promotion_code(code, course_ids):
    """
    Public endpoint: validate a promotion code against a list of course IDs.
    Returns promotion info + computed discount per course + order-level discount if admin promo.
    """
    from decimal import Decimal
    from courses.models import Course

    if not code:
        raise ValidationError({"error": "Mã giảm giá không được để trống."})
    if not course_ids or not isinstance(course_ids, list):
        raise ValidationError({"error": "Danh sách khóa học không hợp lệ."})

    try:
        promotion = (
            Promotion.objects
            .select_related('admin', 'instructor')
            .prefetch_related('applicable_courses', 'applicable_categories')
            .get(code__iexact=code, is_deleted=False)
        )
    except Promotion.DoesNotExist:
        raise ValidationError({"error": "Mã giảm giá không tồn tại."})

    # Validate status
    if promotion.status != Promotion.StatusChoices.ACTIVE:
        raise ValidationError({"error": "Mã giảm giá không còn hoạt động."})

    # Validate dates
    now = timezone.now()
    if promotion.start_date and promotion.end_date:
        if not (promotion.start_date <= now <= promotion.end_date):
            raise ValidationError({"error": "Mã giảm giá đã hết hạn."})

    # Validate usage limit
    if promotion.usage_limit and promotion.used_count >= promotion.usage_limit:
        raise ValidationError({"error": "Mã giảm giá đã hết lượt sử dụng."})

    # Fetch courses
    courses = Course.objects.filter(id__in=course_ids)
    if not courses.exists():
        raise ValidationError({"error": "Không tìm thấy khóa học nào."})

    is_admin_promo = promotion.admin is not None
    is_instructor_promo = promotion.instructor is not None

    applicable_course_ids = set(promotion.applicable_courses.values_list('pk', flat=True))
    applicable_category_ids = set(promotion.applicable_categories.values_list('pk', flat=True))

    result_courses = []
    total_original = Decimal("0.0")
    total_discount = Decimal("0.0")

    if is_instructor_promo:
        # Instructor promo: per-course discount, only for applicable courses
        for course in courses:
            price = Decimal(course.price)
            total_original += price
            discount = Decimal("0.0")

            if course.pk in applicable_course_ids:
                if promotion.discount_type == Promotion.DiscountTypeChoices.PERCENTAGE:
                    discount = price * Decimal(promotion.discount_value) / 100
                elif promotion.discount_type == Promotion.DiscountTypeChoices.FIXED_AMOUNT:
                    discount = Decimal(promotion.discount_value)

                if promotion.max_discount and discount > promotion.max_discount:
                    discount = promotion.max_discount

            total_discount += discount
            result_courses.append({
                "course_id": course.id,
                "course_title": course.title,
                "original_price": str(price),
                "discount": str(discount),
                "final_price": str(price - discount),
                "applicable": course.pk in applicable_course_ids,
            })

    elif is_admin_promo:
        # Admin promo: order-wide discount, check category applicability
        all_categories_valid = True
        for course in courses:
            price = Decimal(course.price)
            total_original += price

            cat_valid = True
            if applicable_category_ids:
                cat_valid = course.category_id and course.category_id in applicable_category_ids
                if not cat_valid:
                    all_categories_valid = False

            result_courses.append({
                "course_id": course.id,
                "course_title": course.title,
                "original_price": str(price),
                "discount": "0.00",
                "final_price": str(price),
                "applicable": cat_valid,
            })

        if not all_categories_valid and applicable_category_ids:
            raise ValidationError({
                "error": "Mã giảm giá không áp dụng cho tất cả khóa học trong giỏ hàng."
            })

        # Check min_purchase
        if total_original < promotion.min_purchase:
            raise ValidationError({
                "error": f"Đơn hàng tối thiểu {promotion.min_purchase} VND để áp dụng mã giảm giá này."
            })

        # Calculate order-level discount
        if promotion.discount_type == Promotion.DiscountTypeChoices.PERCENTAGE:
            total_discount = total_original * Decimal(promotion.discount_value) / 100
        elif promotion.discount_type == Promotion.DiscountTypeChoices.FIXED_AMOUNT:
            total_discount = Decimal(promotion.discount_value)

        if promotion.max_discount and total_discount > promotion.max_discount:
            total_discount = promotion.max_discount

    else:
        raise ValidationError({"error": "Mã giảm giá không hợp lệ."})

    return {
        "promotion": {
            "id": promotion.id,
            "code": promotion.code,
            "description": promotion.description,
            "discount_type": promotion.discount_type,
            "discount_value": str(promotion.discount_value),
            "max_discount": str(promotion.max_discount) if promotion.max_discount else None,
            "min_purchase": str(promotion.min_purchase),
            "type": "admin" if is_admin_promo else "instructor",
        },
        "courses": result_courses,
        "total_original": str(total_original),
        "total_discount": str(total_discount),
        "total_amount": str(total_original - total_discount),
    }
